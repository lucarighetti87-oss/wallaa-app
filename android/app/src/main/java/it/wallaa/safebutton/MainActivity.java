package it.wallaa.safebutton;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state){registerPlugin(WallaaMokoPlugin.class);super.onCreate(state);}
    @Override public void onResume(){super.onResume();WallaaSafetyService.visible=true;WallaaSafetyService.refreshIfVisible(this);}
    @Override public void onPause(){WallaaSafetyService.visible=false;super.onPause();}
}
