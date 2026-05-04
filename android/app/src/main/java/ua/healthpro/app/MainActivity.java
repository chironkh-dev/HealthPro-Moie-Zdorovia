package ua.healthpro.app;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(ForegroundStepPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
