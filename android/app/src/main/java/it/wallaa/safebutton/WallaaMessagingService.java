package it.wallaa.safebutton;

import android.app.*;
import android.content.*;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.capacitorjs.plugins.pushnotifications.MessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/** Data-only FCM handler: native notification delivery even when WebView is suspended. */
public class WallaaMessagingService extends MessagingService {
    @Override public void onMessageReceived(RemoteMessage message){
        Map<String,String> data=message.getData();String type=data.getOrDefault("type","");
        if(type.equals("wallaa_sentinel_refresh")||type.equals("wallaa_sentinel_request"))WallaaSafetyService.requestSentinelRefresh();
        if(type.equals("wallaa_location_request"))WallaaSafetyService.requestAdminRefresh();
        if(type.equals("wallaa_safe"))WallaaSafetyService.alertClosed(data.getOrDefault("alertId",""));
        if(type.equals("wallaa_health_resolved")){clearType("wallaa_health_check");return;}
        boolean backgroundOnly="1".equals(data.get("backgroundOnly"));
        if(!WallaaSafetyService.visible&&!backgroundOnly){
            NotificationManager manager=getSystemService(NotificationManager.class);
            String channel=type.equals("wallaa_sos")?"wallaa_sos":"wallaa_updates";
            if(Build.VERSION.SDK_INT>=26){
                NotificationChannel nc=new NotificationChannel(channel,type.equals("wallaa_sos")?"Allarmi SOS Wallaa":"Avvisi Wallaa",NotificationManager.IMPORTANCE_HIGH);
                nc.enableVibration(true);nc.setVibrationPattern(new long[]{0,300,150,300});
                nc.setSound(Uri.parse("android.resource://"+getPackageName()+"/raw/"+(type.equals("wallaa_sos")?"wallaa_guardian_siren":"wallaa_soft_chime")),new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT).build());
                manager.createNotificationChannel(nc);
            }
            Intent open=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
            open.putExtra("google.message_id",message.getMessageId());for(Map.Entry<String,String> row:data.entrySet())open.putExtra(row.getKey(),row.getValue());
            int id=(type+data.getOrDefault("alertId",data.getOrDefault("offerId",message.getMessageId()))).hashCode();
            PendingIntent pending=PendingIntent.getActivity(this,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            manager.notify(type,id,new NotificationCompat.Builder(this,channel).setSmallIcon(R.drawable.ic_wallaa_notification)
                .setContentTitle(data.getOrDefault("title","Wallaa")).setContentText(data.getOrDefault("body","Apri Wallaa per leggere l’avviso."))
                .setStyle(new NotificationCompat.BigTextStyle().bigText(data.getOrDefault("body",""))).setContentIntent(pending).setAutoCancel(true)
                .setPriority(NotificationCompat.PRIORITY_HIGH).setVibrate(new long[]{0,300,150,300}).build());
        }
        super.onMessageReceived(message);
    }
    private void clearType(String type){if(Build.VERSION.SDK_INT>=23){NotificationManager manager=getSystemService(NotificationManager.class);for(android.service.notification.StatusBarNotification n:manager.getActiveNotifications())if(type.equals(n.getTag()))manager.cancel(n.getTag(),n.getId());}}
}
