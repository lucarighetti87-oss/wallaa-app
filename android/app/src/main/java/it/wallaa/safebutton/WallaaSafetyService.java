package it.wallaa.safebutton;

import android.Manifest;
import android.app.*;
import android.bluetooth.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.*;
import android.os.*;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import org.json.*;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/** Visible, permission-gated foreground service. No wakelock or infinite BLE scan. */
public final class WallaaSafetyService extends Service implements LocationListener {
    static volatile boolean visible,setup,allowConnection=true,sending;
    private static volatile WallaaSafetyService instance;
    private static volatile String state="disconnected",error="";
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ExecutorService http=Executors.newSingleThreadExecutor(),urgent=Executors.newSingleThreadExecutor();
    private final Set<String> inFlight=ConcurrentHashMap.newKeySet();
    private final WallaaButtonProtocol.ClickGate clicks=new WallaaButtonProtocol.ClickGate();
    private final Queue<Runnable> operations=new ArrayDeque<>();
    private SharedPreferences prefs;
    private JSONObject config=new JSONObject();
    private BluetoothGatt gatt;private boolean authenticated,ready,stopping,operationBusy;
    private String connectedDevice="",activeId="";
    private int counter=-1,retries=0;
    private LocationManager locations;private Location lastLocation;
    private long lastSentinelAt,lastLiveAt,wakeUntil,disconnectedAt;
    private boolean waitingForSos,adminLocationPending,liveTracking;private int pendingSequence;
    private final Runnable reconnect=()->connectButton();
    private final Runnable connectionTimeout=()->{if(!ready){error="Il pulsante non ha completato il collegamento.";disconnect(true);}};
    private static UUID uuid(int value){return UUID.fromString(String.format("0000%04x-0000-1000-8000-00805f9b34fb",value));}
    private static final UUID SERVICE=uuid(0xaa00),CCCD=uuid(0x2902);
    static JSObject status(){return new JSObject().put("state",state).put("connected",instance!=null&&instance.authenticated).put("ready",instance!=null&&instance.ready).put("error",error).put("platform","android");}
    static void requestSentinelRefresh(){WallaaSafetyService current=instance;if(current!=null&&current.sentinelAvailable())current.main.post(()->{current.wakeUntil=SystemClock.elapsedRealtime()+25000;current.lastSentinelAt=0;current.updateLocationPolicy();});}
    static void requestAdminRefresh(){WallaaSafetyService current=instance;if(current!=null){JSONObject profile=current.config.optJSONObject("profile");if(profile!=null&&profile.optBoolean("liveProtectionEnabled"))current.main.post(()->{current.adminLocationPending=true;current.wakeUntil=SystemClock.elapsedRealtime()+25000;current.updateLocationPolicy();});}}
    static void alertClosed(String id){WallaaSafetyService current=instance;if(current!=null)current.main.post(()->{if(current.activeId.equals(id)){current.activeId="";current.updateLocationPolicy();}});}
    static void releaseButton(){if(instance!=null)instance.main.post(()->instance.disconnect(false));}
    static void refreshIfVisible(Context context){
        if(!visible)return;
        JSONObject c=read(context,"wallaa.safe.background.config"),s=read(context,"wallaa.safe.sentinel.native");
        boolean need=(c.optBoolean("armed")&&!c.optString("deviceId").isEmpty())||(s.optBoolean("active")&&s.optBoolean("available"));
        if(!need){context.stopService(new Intent(context,WallaaSafetyService.class));return;}
        try{ContextCompat.startForegroundService(context,new Intent(context,WallaaSafetyService.class));}catch(RuntimeException e){error="Apri Wallaa e controlla le autorizzazioni per la protezione in background.";}
    }
    static JSONObject read(Context c,String key){try{return new JSONObject(c.getSharedPreferences("CapacitorStorage",0).getString(key,"{}"));}catch(Exception e){return new JSONObject();}}
    private boolean granted(String p){return ContextCompat.checkSelfPermission(this,p)==PackageManager.PERMISSION_GRANTED;}
    @Override public void onCreate(){super.onCreate();instance=this;prefs=getSharedPreferences("CapacitorStorage",0);locations=(LocationManager)getSystemService(LOCATION_SERVICE);}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        config=read(this,"wallaa.safe.background.config");JSONObject saved=read(this,"wallaa.safe.active.alert");activeId=saved.optBoolean("active",false)?saved.optString("id"):"";liveTracking=saved.optBoolean("liveTracking",false);
        if(config.optJSONObject("identity")==null || config.optJSONObject("identity").optString("authToken").isEmpty()){stopSelf();return START_NOT_STICKY;}
        int types=0;
        if(Build.VERSION.SDK_INT<31||granted(Manifest.permission.BLUETOOTH_CONNECT))types|=ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE;
        if(granted(Manifest.permission.ACCESS_COARSE_LOCATION))types|=ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION;
        if(types==0){stopSelf();return START_NOT_STICKY;}
        NotificationManager manager=getSystemService(NotificationManager.class);
        if(Build.VERSION.SDK_INT>=26)manager.createNotificationChannel(new NotificationChannel("wallaa_protection","Protezione Wallaa",NotificationManager.IMPORTANCE_LOW));
        PendingIntent open=PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notice=new NotificationCompat.Builder(this,"wallaa_protection").setSmallIcon(R.drawable.ic_wallaa_notification).setContentTitle("Wallaa · collegamento e posizione")
            .setContentText("Pulsante e disponibilità Sentinel secondo le tue impostazioni").setContentIntent(open).setOngoing(true).build();
        try{ServiceCompat.startForeground(this,401,notice,types);}catch(RuntimeException e){error="Autorizzazioni background incomplete: apri Wallaa.";stopSelf();return START_NOT_STICKY;}
        if("sentinel-refresh".equals(intent==null?"":intent.getAction()))wakeUntil=SystemClock.elapsedRealtime()+25000;
        updateLocationPolicy();connectButton();return START_STICKY;
    }
    private boolean sentinelAvailable(){JSONObject s=read(this,"wallaa.safe.sentinel.native");return s.optBoolean("active")&&s.optBoolean("available");}
    private boolean intervention(){return "busy".equals(read(this,"wallaa.safe.sentinel.native").optString("status"));}
    private boolean liveEnabled(){JSONObject profile=config.optJSONObject("profile");return liveTracking&&!activeId.isEmpty()&&profile!=null&&profile.optBoolean("sosLocationEnabled",true);}
    private boolean emergency(){return liveEnabled()||intervention()||SystemClock.elapsedRealtime()<wakeUntil;}
    private void updateLocationPolicy(){
        try{
            locations.removeUpdates(this);
            if(!granted(Manifest.permission.ACCESS_COARSE_LOCATION))return;
            if(!sentinelAvailable()&&!liveEnabled()&&!waitingForSos&&!adminLocationPending)return;
            // Passive provider reuses other apps' fixes; network provider is ordinary low-power.
            locations.requestLocationUpdates(LocationManager.PASSIVE_PROVIDER,300000,100,this,Looper.getMainLooper());
            if(locations.isProviderEnabled(LocationManager.NETWORK_PROVIDER))locations.requestLocationUpdates(LocationManager.NETWORK_PROVIDER,emergency()?10000:300000,emergency()?10:100,this,Looper.getMainLooper());
            if(emergency()&&granted(Manifest.permission.ACCESS_FINE_LOCATION)&&locations.isProviderEnabled(LocationManager.GPS_PROVIDER))locations.requestLocationUpdates(LocationManager.GPS_PROVIDER,5000,10,this,Looper.getMainLooper());
            if(wakeUntil>0)main.postDelayed(()->{if(SystemClock.elapsedRealtime()>=wakeUntil){wakeUntil=0;adminLocationPending=false;updateLocationPolicy();}},25000);
        }catch(SecurityException|IllegalArgumentException e){error="Posizione non disponibile: controlla le autorizzazioni.";}
    }
    @Override public void onLocationChanged(Location location){
        if(location==null||!location.hasAccuracy()||System.currentTimeMillis()-location.getTime()>60000)return;
        lastLocation=location;
        if(adminLocationPending){adminLocationPending=false;try{request("/api/account/location-snapshot",new JSONObject().put("location",locationJson(location)),null);}catch(JSONException ignored){}}
        if(waitingForSos){waitingForSos=false;sendSos(location,pendingSequence);return;}
        long now=SystemClock.elapsedRealtime();
        if(sentinelAvailable() && now-lastSentinelAt>=(emergency()?60000:300000)){
            lastSentinelAt=now;
            try{JSONObject body=new JSONObject().put("location",locationJson(location));request("/api/sentinel/heartbeat",body,(result,failure)->{
                if(failure==null&&result!=null){JSONObject s=read(this,"wallaa.safe.sentinel.native");String next=result.optString("status",s.optString("status"));try{s.put("status",next);prefs.edit().putString("wallaa.safe.sentinel.native",s.toString()).apply();}catch(JSONException ignored){}}
            });}catch(JSONException ignored){}
        }
        if(liveEnabled()&&now-lastLiveAt>=5000){lastLiveAt=now;try{request("/api/alerts/"+activeId+"/location",new JSONObject().put("location",locationJson(location)),null);}catch(JSONException ignored){}}
    }
    private JSONObject locationJson(Location l)throws JSONException{return new JSONObject().put("latitude",l.getLatitude()).put("longitude",l.getLongitude()).put("accuracy",Math.round(l.getAccuracy())).put("capturedAt",Instant.ofEpochMilli(l.getTime()).toString());}
    private BluetoothGattCharacteristic characteristic(int id){BluetoothGattService service=gatt==null?null:gatt.getService(SERVICE);return service==null?null:service.getCharacteristic(uuid(id));}
    private void connectButton(){
        config=read(this,"wallaa.safe.background.config");
        if(stopping||gatt!=null||!allowConnection||!config.optBoolean("armed")||!getSharedPreferences("wallaa.native",0).getBoolean("buttonEnabled",false))return;
        String id=config.optString("deviceId");if(!BluetoothAdapter.checkBluetoothAddress(id)){state="disconnected";return;}
        if(Build.VERSION.SDK_INT>=31&&!granted(Manifest.permission.BLUETOOTH_CONNECT)){state="permission_required";return;}
        try{BluetoothAdapter adapter=((BluetoothManager)getSystemService(BLUETOOTH_SERVICE)).getAdapter();if(adapter==null||!adapter.isEnabled()){state="bluetooth_off";return;}
            connectedDevice=id;state="connecting";error="";gatt=adapter.getRemoteDevice(id).connectGatt(this,false,callback,BluetoothDevice.TRANSPORT_LE);
            main.removeCallbacks(connectionTimeout);main.postDelayed(connectionTimeout,20000);
        }catch(SecurityException|IllegalArgumentException e){state="connection_failed";error="Impossibile collegare il pulsante: controlla Bluetooth e autorizzazioni.";}
    }
    private void disconnect(boolean retry){
        authenticated=false;ready=false;counter=-1;clicks.reset();operations.clear();operationBusy=false;main.removeCallbacks(connectionTimeout);
        BluetoothGatt old=gatt;gatt=null;
        if(old!=null){try{old.disconnect();old.close();}catch(SecurityException ignored){}}
        state="disconnected";
        if(retry&&!stopping&&allowConnection){if(disconnectedAt==0)disconnectedAt=SystemClock.elapsedRealtime();main.removeCallbacks(reconnect);main.postDelayed(reconnect,Math.min(60000,2000L<<Math.min(retries++,5)));}
    }
    private void queue(Runnable op){operations.add(op);next();}
    private void next(){if(operationBusy)return;Runnable op=operations.poll();if(op!=null){operationBusy=true;try{op.run();}catch(SecurityException e){disconnect(true);}}}
    private void completed(){operationBusy=false;next();}
    private void subscribe(int id,Runnable after){
        BluetoothGattCharacteristic c=characteristic(id);if(c==null){error="Servizi del pulsante incompleti.";disconnect(false);return;}
        queue(()->{try{BluetoothGattDescriptor descriptor=c.getDescriptor(CCCD);if(descriptor==null||gatt==null||!gatt.setCharacteristicNotification(c,true)){disconnect(true);return;}
            descriptor.setValue(BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE);if(!gatt.writeDescriptor(descriptor)){disconnect(true);return;}
            subscriptionAfter=after;}catch(SecurityException denied){error="Permesso Bluetooth revocato.";disconnect(false);}});
    }
    private Runnable subscriptionAfter;
    private void write(int id,byte[] data){queue(()->{try{BluetoothGattCharacteristic c=characteristic(id);if(c==null||gatt==null){disconnect(true);return;}c.setValue(data);c.setWriteType(BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT);if(!gatt.writeCharacteristic(c))disconnect(true);}catch(SecurityException denied){error="Permesso Bluetooth revocato.";disconnect(false);}});}
    private void dismiss(){write(0xaa01,new byte[]{(byte)0xea,1,0x41,0});}
    private final BluetoothGattCallback callback=new BluetoothGattCallback(){
        @Override public void onConnectionStateChange(BluetoothGatt source,int status,int connection){main.post(()->{
            if(source!=gatt)return;
            if(status!=BluetoothGatt.GATT_SUCCESS||connection==BluetoothProfile.STATE_DISCONNECTED){disconnect(true);return;}
            if(connection==BluetoothProfile.STATE_CONNECTED){state="discovering";try{if(!source.discoverServices())disconnect(true);}catch(SecurityException denied){error="Permesso Bluetooth revocato.";disconnect(false);}}
        });}
        @Override public void onServicesDiscovered(BluetoothGatt source,int status){main.post(()->{
            if(source!=gatt)return;if(status!=0){disconnect(true);return;}
            subscribe(0xaa07,()->subscribe(0xaa01,()->{
                Runnable auth=()->{try{String password=WallaaSecrets.read(WallaaSafetyService.this,config.optString("hardwareId"));if(password==null){state="password_required";disconnect(false);return;}state="authenticating";write(0xaa07,WallaaButtonProtocol.auth(password));}catch(Exception e){disconnect(false);}};
                if(characteristic(0xaa02)!=null)subscribe(0xaa02,auth);else auth.run();
            }));
        });}
        @Override public void onDescriptorWrite(BluetoothGatt source,BluetoothGattDescriptor d,int status){main.post(()->{if(source!=gatt)return;if(status!=0){disconnect(true);return;}Runnable after=subscriptionAfter;subscriptionAfter=null;completed();if(after!=null)after.run();});}
        @Override public void onCharacteristicWrite(BluetoothGatt source,BluetoothGattCharacteristic c,int status){main.post(()->{if(source!=gatt)return;if(status!=0){disconnect(true);return;}completed();});}
        @Override public void onCharacteristicChanged(BluetoothGatt source,BluetoothGattCharacteristic c){byte[] value=c.getValue();UUID id=c.getUuid();main.post(()->{if(source==gatt)received(id,value);});}
        @Override public void onCharacteristicChanged(BluetoothGatt source,BluetoothGattCharacteristic c,byte[] value){UUID id=c.getUuid();main.post(()->{if(source==gatt)received(id,value);});}
    };
    private void received(UUID id,byte[] value){
        if(id.equals(uuid(0xaa07))){int answer=WallaaButtonProtocol.reply(value,1,0x55);if(answer<0)return;if(answer!=0xaa){error="Password del pulsante non accettata.";disconnect(false);return;}authenticated=true;state="verifying";write(0xaa01,new byte[]{(byte)0xea,0,0x20,0});return;}
        if(id.equals(uuid(0xaa01))&&authenticated&&value!=null&&value.length==10&&(value[0]&255)==0xeb&&value[1]==0&&value[2]==0x20&&value[3]==6){
            StringBuilder hardware=new StringBuilder("MOKO:");for(int n=4;n<10;n++)hardware.append(String.format("%02X",value[n]&255));
            if(!hardware.toString().equals(config.optString("hardwareId"))){error="Identità del pulsante differente da quella associata.";disconnect(false);return;}
            state="synchronizing";subscribe(0xaa08,this::dismiss);return;
        }
        if(!authenticated||!id.equals(uuid(0xaa08)))return;
        int count=WallaaButtonProtocol.reply(value,2,6);if(count<0)return;
        if(count==0){counter=0;ready=true;state="ready";retries=0;disconnectedAt=0;main.removeCallbacks(connectionTimeout);return;}
        if(!ready){dismiss();return;}int prior=counter;counter=count;
        if(setup||!config.optBoolean("armed")||prior<0||prior==count)return;
        int quantity=count>prior?count-prior:count;
        boolean accepted=clicks.accept(config.optString("trigger","double_press"),quantity,SystemClock.elapsedRealtime());dismiss();
        if(!accepted||sending||!activeId.isEmpty())return;
        String key="sequence."+config.optString("hardwareId");SharedPreferences nativePrefs=getSharedPreferences("wallaa.native",0);
        int seq=(nativePrefs.getInt(key,0)%65535)+1;nativePrefs.edit().putInt(key,seq).apply();
        triggerSos(seq);
    }
    private void triggerSos(int sequence){
        if(sending)return;sending=true;pendingSequence=sequence;
        boolean share=config.optJSONObject("profile")!=null&&config.optJSONObject("profile").optBoolean("sosLocationEnabled",true);
        if(!share){sendSos(null,sequence);return;}
        if(lastLocation!=null&&System.currentTimeMillis()-lastLocation.getTime()<60000){sendSos(lastLocation,sequence);return;}
        waitingForSos=true;wakeUntil=SystemClock.elapsedRealtime()+25000;updateLocationPolicy();
        main.postDelayed(()->{if(waitingForSos){waitingForSos=false;sendSos(null,sequence);}},8000);
    }
    private void sendSos(Location location,int sequence){
        try{JSONObject profile=config.optJSONObject("profile");if(profile==null)profile=new JSONObject();
            JSONObject payload=new JSONObject().put("userName",profile.optString("name","Utente Wallaa")).put("userPhone",profile.optString("phone")).put("safetyWord",profile.optString("safetyWord"))
                .put("language",profile.optString("language","it")).put("trigger","press").put("locationEnabled",profile.optBoolean("sosLocationEnabled",true)).put("eventPacketId",sequence)
                .put("device",new JSONObject().put("name","Wallaa Button").put("id",connectedDevice).put("hardwareId",config.optString("hardwareId")).put("claimToken",config.optString("claimToken")))
                .put("contacts",config.optJSONArray("contacts")==null?new JSONArray():config.optJSONArray("contacts"));
            if(location!=null&&profile.optBoolean("sosLocationEnabled",true))payload.put("location",locationJson(location));
            request("/api/alert",payload,(result,failure)->{
                sending=false;
                if(failure!=null){error="Invio SOS non confermato. Apri Wallaa e controlla la connessione.";state=ready?"ready":"disconnected";notifyFailure(error);return;}
                activeId=result.optString("alertId");liveTracking=result.optBoolean("liveTracking",false);if(activeId.isEmpty()){error="Risposta SOS non valida.";notifyFailure(error);return;}
                try{JSONObject alert=new JSONObject(result.toString()).put("id",activeId).put("active",true).put("trigger","press").put("at",Instant.now().toString());prefs.edit().putString("wallaa.safe.native.alert",alert.toString()).putString("wallaa.safe.active.alert",alert.toString()).apply();}catch(JSONException ignored){}
                updateLocationPolicy();
            });
        }catch(JSONException e){sending=false;notifyFailure("SOS non inviato: riapri Wallaa.");}
    }
    private void notifyFailure(String body){Notification n=new NotificationCompat.Builder(this,"wallaa_protection").setSmallIcon(R.drawable.ic_wallaa_notification).setContentTitle("Wallaa · controlla l’invio SOS").setContentText(body).setPriority(NotificationCompat.PRIORITY_HIGH).build();getSystemService(NotificationManager.class).notify(402,n);}
    private interface Response {void accept(JSONObject result,String error);}
    private void request(String path,JSONObject body,Response callback){
        if(stopping||!inFlight.add(path)){if(callback!=null)callback.accept(null,"Operazione già in corso o protezione arrestata.");return;}
        JSONObject snapshot=config;try{(path.equals("/api/alert")?urgent:http).execute(()->{JSONObject result=null;String failure=null;HttpURLConnection connection=null;
            try{URL configured=new URL(snapshot.optString("apiUrl"));if(!"https".equals(configured.getProtocol()))throw new IOException("HTTPS richiesto");
                URL url=new URL(configured.getProtocol(),configured.getHost(),configured.getPort(),path);connection=(HttpURLConnection)url.openConnection();connection.setInstanceFollowRedirects(false);connection.setConnectTimeout(10000);connection.setReadTimeout(15000);
                connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");JSONObject identity=snapshot.getJSONObject("identity");
                connection.setRequestProperty("x-wallaa-installation-id",identity.optString("installationId"));connection.setRequestProperty("x-wallaa-install-token",identity.optString("authToken"));
                try(OutputStream out=connection.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}
                int code=connection.getResponseCode();if(code<200||code>=300)throw new IOException("Server "+code);
                try(InputStream in=connection.getInputStream()){ByteArrayOutputStream bytes=new ByteArrayOutputStream();byte[] chunk=new byte[4096];int n;while((n=in.read(chunk))!=-1){if(bytes.size()+n>1048576)throw new IOException("Risposta troppo grande");bytes.write(chunk,0,n);}result=new JSONObject(bytes.toString("UTF-8"));}
            }catch(Exception e){failure=e.getMessage();}finally{if(connection!=null)connection.disconnect();inFlight.remove(path);}
            JSONObject value=result;String problem=failure;if(callback!=null&&!stopping)main.post(()->callback.accept(value,problem));
        });}catch(RejectedExecutionException e){inFlight.remove(path);if(callback!=null)callback.accept(null,"Protezione arrestata.");}
    }
    @Override public void onDestroy(){stopping=true;main.removeCallbacksAndMessages(null);disconnect(false);try{locations.removeUpdates(this);}catch(SecurityException ignored){}http.shutdownNow();urgent.shutdownNow();sending=false;instance=null;super.onDestroy();}
    @Override public IBinder onBind(Intent intent){return null;}
}
