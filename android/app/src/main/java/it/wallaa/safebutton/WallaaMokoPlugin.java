package it.wallaa.safebutton;

import android.Manifest;
import android.app.NotificationManager;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;
import android.content.pm.PackageManager;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;

@CapacitorPlugin(name="WallaaMoko",permissions={
    @Permission(alias="location",strings={Manifest.permission.ACCESS_COARSE_LOCATION,Manifest.permission.ACCESS_FINE_LOCATION})
})
public class WallaaMokoPlugin extends Plugin implements SharedPreferences.OnSharedPreferenceChangeListener {
    @Override public void load(){getContext().getSharedPreferences("CapacitorStorage",0).registerOnSharedPreferenceChangeListener(this);}
    @Override public void handleOnDestroy(){getContext().getSharedPreferences("CapacitorStorage",0).unregisterOnSharedPreferenceChangeListener(this);}
    @Override public void onSharedPreferenceChanged(SharedPreferences p,String key){
        if(key.equals("wallaa.safe.background.config")||key.equals("wallaa.safe.sentinel.native")||key.equals("wallaa.safe.active.alert"))WallaaSafetyService.refreshIfVisible(getContext());
    }
    @PluginMethod public void configure(PluginCall call){
        String hardware=call.getString("hardwareId","");
        if(!hardware.matches("MOKO:[0-9A-F]{12}")){call.reject("Identità pulsante non valida.");return;}
        try{
            String password=call.getString("password");
            if(password!=null && (!call.getBoolean("useExistingPassword",false)||WallaaSecrets.read(getContext(),hardware)==null))WallaaSecrets.save(getContext(),hardware,password);
            getContext().getSharedPreferences("wallaa.native",0).edit().putBoolean("buttonEnabled",call.getBoolean("enabled",false)).apply();
            WallaaSafetyService.allowConnection=true;WallaaSafetyService.refreshIfVisible(getContext());call.resolve(new JSObject().put("enabled",call.getBoolean("enabled",false)));
        }catch(Exception e){call.reject("Impossibile salvare la configurazione protetta del pulsante.");}
    }
    @PluginMethod public void pushAvailable(PluginCall call){call.resolve(new JSObject().put("configured",!com.google.firebase.FirebaseApp.getApps(getContext()).isEmpty()));}
    @PluginMethod public void status(PluginCall call){call.resolve(WallaaSafetyService.status());}
    @PluginMethod public void beginSetup(PluginCall call){
        if(WallaaSafetyService.sending){call.reject("Attendi la conclusione dell’invio SOS.");return;}
        WallaaSafetyService.setup=true;WallaaSafetyService.allowConnection=false;WallaaSafetyService.releaseButton();
        getActivity().runOnUiThread(()->new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(call::resolve,400));
    }
    @PluginMethod public void endSetup(PluginCall call){WallaaSafetyService.setup=call.getBoolean("keepSuppressed",false);WallaaSafetyService.allowConnection=true;WallaaSafetyService.refreshIfVisible(getContext());call.resolve();}
    @PluginMethod public void authorizeAccessory(PluginCall call){call.resolve(new JSObject().put("supported",true));}
    @PluginMethod public void cancelAccessory(PluginCall call){call.resolve();}
    @PluginMethod public void forgetAccessory(PluginCall call){getContext().getSharedPreferences("wallaa.native",0).edit().putBoolean("buttonEnabled",false).apply();WallaaSafetyService.releaseButton();call.resolve();}
    @PluginMethod public void permissions(PluginCall call){
        boolean fine=granted(Manifest.permission.ACCESS_FINE_LOCATION),background=Build.VERSION.SDK_INT<29||granted(Manifest.permission.ACCESS_BACKGROUND_LOCATION);
        BluetoothAdapter adapter=((BluetoothManager)getContext().getSystemService(android.content.Context.BLUETOOTH_SERVICE)).getAdapter();
        boolean bluetooth=Build.VERSION.SDK_INT<31||(granted(Manifest.permission.BLUETOOTH_CONNECT)&&granted(Manifest.permission.BLUETOOTH_SCAN));
        try{bluetooth=bluetooth&&adapter!=null&&adapter.isEnabled();}catch(SecurityException e){bluetooth=false;}
        call.resolve(new JSObject().put("location",fine?(background?"always":"when-in-use"):"not-determined").put("bluetooth",bluetooth)
            .put("notifications",NotificationManagerCompat.from(getContext()).areNotificationsEnabled()).put("backgroundRefresh",background)
            .put("backgroundLocation",background).put("platform","android"));
    }
    private boolean granted(String p){return ContextCompat.checkSelfPermission(getContext(),p)==PackageManager.PERMISSION_GRANTED;}
    @PluginMethod public void requestLocation(PluginCall call){requestPermissionForAlias("location",call,"locationResult");}
    @PermissionCallback private void locationResult(PluginCall call){call.resolve();}
    @PluginMethod public void openSettings(PluginCall call){getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getContext().getPackageName())));call.resolve();}
    @PluginMethod public void clearHealthNotices(PluginCall call){NotificationManager manager=getContext().getSystemService(NotificationManager.class);for(android.service.notification.StatusBarNotification n:manager.getActiveNotifications())if("wallaa_health_check".equals(n.getTag()))manager.cancel(n.getTag(),n.getId());call.resolve();}
    @PluginMethod public void clearIconBadge(PluginCall call){call.resolve();}
    @PluginMethod public void alarmAudio(PluginCall call){call.resolve();}
}
