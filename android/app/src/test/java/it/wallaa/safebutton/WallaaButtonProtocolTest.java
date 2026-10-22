package it.wallaa.safebutton;
import org.junit.Test;
import static org.junit.Assert.*;
public class WallaaButtonProtocolTest {
 @Test public void countersMustBeValidNotifications(){assertEquals(-1,WallaaButtonProtocol.reply(new byte[]{(byte)0xeb,2,6,0,1},2,6));assertEquals(1,WallaaButtonProtocol.reply(new byte[]{(byte)0xeb,2,6,1,1},2,6));assertEquals(-1,WallaaButtonProtocol.reply(new byte[]{(byte)0xeb,1,6,1,1},2,6));}
 @Test public void doubleClickRequiresTwoRecentPressesAndPanicBurstsTrigger(){WallaaButtonProtocol.ClickGate gate=new WallaaButtonProtocol.ClickGate();assertFalse(gate.accept("double_press",1,1000));assertTrue(gate.accept("double_press",1,2500));assertFalse(gate.accept("double_press",1,5000));assertFalse(gate.accept("double_press",1,8001));assertTrue(gate.accept("double_press",7,8500));}
 @Test public void disablingOrReconnectingResetsPartialPress(){WallaaButtonProtocol.ClickGate gate=new WallaaButtonProtocol.ClickGate();assertFalse(gate.accept("double_press",1,1000));gate.reset();assertFalse(gate.accept("double_press",1,1500));assertTrue(gate.accept("press",1,2000));assertFalse(gate.accept("unsupported",1,3000));}
 @Test public void authenticationUsesOnlyPrintableAsciiAndPreservesVendorFrame(){assertArrayEquals(new byte[]{(byte)0xea,1,0x55,1,'x'},WallaaButtonProtocol.auth("x"));try{WallaaButtonProtocol.auth("\n");fail();}catch(IllegalArgumentException expected){}}
}
