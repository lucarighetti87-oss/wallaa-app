package it.wallaa.safebutton;

import java.nio.charset.StandardCharsets;

/** Pure protocol/state logic; never treats a connection or retained counter as SOS. */
final class WallaaButtonProtocol {
    static byte[] auth(String password) {
        if(password == null || !password.matches("[\\x20-\\x7e]{1,16}")) throw new IllegalArgumentException("Password del pulsante non valida");
        byte[] p=password.getBytes(StandardCharsets.US_ASCII), result=new byte[4+p.length];
        result[0]=(byte)0xea;result[1]=1;result[2]=0x55;result[3]=(byte)p.length;
        System.arraycopy(p,0,result,4,p.length);return result;
    }
    static int reply(byte[] bytes,int flag,int command) {
        if(bytes==null || bytes.length!=5 || (bytes[0]&255)!=0xeb || (bytes[1]&255)!=flag || (bytes[2]&255)!=command || bytes[3]!=1)return -1;
        return bytes[4]&255;
    }
    static final class ClickGate {
        private long first=-1;private int clicks=0;
        void reset(){first=-1;clicks=0;}
        boolean accept(String mode,int quantity,long now) {
            if(quantity<=0)return false;
            if(!"double_press".equals(mode))return "press".equals(mode)||"any_press".equals(mode);
            if(first<0 || now-first>2000 || now<first){first=now;clicks=0;}
            clicks+=quantity;
            if(clicks<2)return false;
            reset();return true;
        }
    }
}
