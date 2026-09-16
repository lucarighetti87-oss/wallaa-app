import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from './components/Toast';
import Modal from './components/Modal';
import AlertResult from './components/AlertResult';
import IncomingAlert from './components/IncomingAlert';
import V4TopBar from './components/V4TopBar';
import V4BottomNav from './components/V4BottomNav';
import SideMenu from './components/SideMenu';
import SOSActivation from './components/SOSActivation';
import EmergencyDispatchOverlay from './components/EmergencyDispatchOverlay';
import HomeV4Screen from './screens/HomeV4Screen';
import ContactsScreen from './screens/ContactsScreen';
import DeviceScreen from './screens/DeviceScreen';
import ActivityScreen from './screens/ActivityScreen';
import MessagesScreen from './screens/MessagesScreen';
import ChatScreen from './screens/ChatScreen';
import SettingsScreen from './screens/SettingsScreen';
import NetworkScreen from './screens/NetworkScreen';
import ActiveAlertScreen from './screens/ActiveAlertScreen';
import MapScreen from './screens/MapScreen';
import GuardianModeScreen from './screens/GuardianModeScreen';
import ResolvedAlertScreen from './screens/ResolvedAlertScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import SecurityCheckScreen from './screens/SecurityCheckScreen';
import SentinelScreen from './screens/SentinelScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import PrivacyCenterScreen from './screens/PrivacyCenterScreen';
import LegalUpdateScreen from './screens/LegalUpdateScreen';
import { useWallaaSafe } from './hooks/useWallaaSafe';
import { detectDeviceLanguage, translate } from './i18n';
import { getWallaaConversations } from './services/network.js';

const emptyContact = {
  id: '', name: '', email: '', phone: '', role: 'guardian',
  permissions: { sosAlerts: true, liveLocation: true, disconnectAlerts: true }
};

export default function App() {
  const safe = useWallaaSafe();
  const [screen, setScreen] = useState('home');
  const [selectedConversation, setSelectedConversation] = useState(null);

  useEffect(() => {
    const messagePush = safe.messagePush;

    // A notification received while the user is already using Wallaa
    // must not force navigation away from the current safety screen.
    if (!messagePush?.opened || !messagePush?.conversationId) return;

    let cancelled = false;

    (async () => {
      try {
        const result = await getWallaaConversations(safe.networkIdentity);
        if (cancelled) return;

        const conversations = result?.conversations || [];
        const conversation = conversations.find(
          (item) => String(item?.id) === String(messagePush.conversationId)
        );

        if (!conversation) {
          setScreen('messages');
          return;
        }

        setSelectedConversation(conversation);
        setScreen('chat');
      } catch (error) {
        if (!cancelled) {
          console.warn('[WALLAA][MESSAGE][OPEN_PUSH]', error?.message || error);
          setScreen('messages');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    safe.messagePush,
    safe.networkIdentity?.installationId,
    safe.networkIdentity?.authToken
  ]);

  const [drawer, setDrawer] = useState(false);
  const [contactModal, setContactModal] = useState(false);
  const [contactDraft, setContactDraft] = useState(emptyContact);
  const [result, setResult] = useState(null);
  const [sosActivation, setSosActivation] = useState(false);
  const [splashMinDone, setSplashMinDone] = useState(false);
  const mainRef = useRef(null);
  const language = safe.profile?.language || detectDeviceLanguage();
  const t = useCallback((key, vars) => translate(language, key, vars), [language]);

  useEffect(() => {
    if (safe.activeAlert?.active) setScreen('active-alert');
    else if (safe.resolvedAlert) setScreen('resolved-alert');
  }, [safe.activeAlert?.id, safe.activeAlert?.active, safe.resolvedAlert?.resolvedAt]);

  useEffect(() => {
    setDrawer(false);
  }, [screen]);

  useEffect(() => {
    const timer = setTimeout(() => setSplashMinDone(true), 1450);
    return () => clearTimeout(timer);
  }, []);

  // Every section must open from its real top on iOS. Capacitor's WKWebView
  // preserves the previous scroll position unless we explicitly reset it.
  useEffect(() => {
    const resetScroll = () => {
      try { globalThis.scrollTo?.({ top: 0, left: 0, behavior: 'auto' }); } catch { globalThis.scrollTo?.(0, 0); }
      if (document?.documentElement) document.documentElement.scrollTop = 0;
      if (document?.body) document.body.scrollTop = 0;
      if (mainRef.current) mainRef.current.scrollTop = 0;
      const current = mainRef.current?.querySelector?.('.screen-transition');
      if (current) current.scrollTop = 0;
    };
    resetScroll();
    const raf = requestAnimationFrame(resetScroll);
    const timer = setTimeout(resetScroll, 40);
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [screen]);

  // Transient acknowledgements (for example "Wallaa Button connesso") must
  // confirm the action without covering the interface. Errors remain longer.
  useEffect(() => {
    if (!safe.toast) return undefined;
    const lifetime = safe.toast.type === 'error' ? 4200 : safe.toast.type === 'warning' ? 2600 : 1400;
    const timer = setTimeout(() => safe.setToast(null), lifetime);
    return () => clearTimeout(timer);
  }, [safe.toast]);

  if (!safe.loaded || !splashMinDone) {
    return (
      <div className="splash splash-radar-ready" role="status" aria-label={t('splash.loadingAria')}>
        <div className="splash-aura"/>
        <div className="splash-radar" aria-hidden="true"><i/><i/><i/></div>
        <div className="splash-logo"><img src="/wallaa-app-icon.png" alt="Wallaa"/></div>
        <h1>WALLAA</h1>
        <p className="splash-brand-slogan">Stay safe. Press Wallaa.</p><p className="splash-subtitle">{t('splash.ecosystem')}</p>
        <div className="splash-state" aria-hidden="true">
          <span className="splash-state-searching">{t('splash.scanning')}</span>
          <span className="splash-state-ready">{t('splash.ready')}</span>
        </div>
      </div>
    );
  }

  if (!safe.authenticated) {
    return <OnboardingScreen profile={safe.profile} onComplete={safe.completeOnboarding} onLogin={safe.loginAccount} initialMode={safe.profile?.onboardingComplete ? 'login' : 'register'} t={t} />;
  }

  const emergencyInProgress = Boolean(
    safe.activeAlert?.active || safe.incomingAlert
  );

  if (!emergencyInProgress && safe.legalGatePending) {
    return (
      <div className="splash splash-radar-ready" role="status">
        <div className="splash-aura"/>
        <div className="splash-radar" aria-hidden="true"><i/><i/><i/></div>
        <div className="splash-logo">
          <img src="/wallaa-app-icon.png" alt="Wallaa"/>
        </div>
        <h1>WALLAA</h1>
        <p className="splash-brand-slogan">Stay safe. Press Wallaa.</p>
        <p className="splash-subtitle">Verifica documenti legali…</p>
      </div>
    );
  }

  if (!emergencyInProgress && safe.legalRequired) {
    return (
      <LegalUpdateScreen
        language={language}
        onAccept={safe.acceptLegalUpdate}
        onSignOut={safe.signOut}
        legalError={safe.legalError}
      />
    );
  }

  async function submitContact(e) {
    e.preventDefault();
    try {
      await safe.addOrUpdateContact(contactDraft);
      setContactModal(false); setContactDraft(emptyContact);
      safe.setToast({ type: 'success', text: t('toast.contactSaved') });
    } catch (error) { safe.setToast({ type: 'error', text: error.message }); }
  }

  async function testSOS() {
    try { const alert = await safe.fireAlert('manual_test'); if (alert) setResult(alert); }
    catch { /* hook manages toast */ }
  }

  async function activateSOS() {
    try {
      const alert = await safe.fireAlert('manual_sos');
      setSosActivation(false);
      if (alert) setScreen('active-alert');
    } catch {
      setSosActivation(false);
    }
  }

  async function resetAll() {
    if (!confirm(t('v4.confirm.reset'))) return;
    await safe.clearData(); setScreen('home');
  }

  async function deleteAccount() {
    if (!confirm(t('v4.confirm.deleteAccount'))) return;
    try { await safe.deleteAccount(); setScreen('home'); }
    catch (error) { safe.setToast({ type: 'error', text: error.message }); }
  }

  async function markSafe() {
    try { await safe.closeActiveAlert(); setScreen('home'); }
    catch { /* toast */ }
  }

  async function clearActivityFeed(targetScreen) {
    if (!confirm(t('v412.activity.clearConfirm'))) return;
    await safe.clearActivities();
    setScreen(targetScreen);
  }

  const common = { ...safe, onNavigate: setScreen, t, language };
  const showDock = ['home','map','messages','settings'].includes(screen);
  const showTopBar = ['home','contacts','map','messages','activity','settings','network','security-check'].includes(screen);

  return (
    <div className={`app-shell-v4 screen-${screen}`}>
      {showTopBar && <V4TopBar onMenu={() => setDrawer(true)} onNotifications={() => setScreen('notifications')} onHome={() => setScreen('home')} t={t} />}
      <main ref={mainRef} className="app-main-v4"><div className="screen-transition" key={screen}>
        {screen === 'home' && <HomeV4Screen {...common} onSOSStart={() => setSosActivation(true)} onSOSCancel={() => { if (!safe.busy) setSosActivation(false); }} onSafetyCheck={() => setScreen('security-check')} />}
        {screen === 'security-check' && <SecurityCheckScreen {...common} onBack={() => setScreen('home')} onRefreshSystemHealth={safe.refreshSystemHealth} />}
        {screen === 'contacts' && <ContactsScreen contacts={safe.contacts} plan={safe.profile?.plan || 'basic'} t={t} onBack={() => setScreen('home')} onAdd={() => { setContactDraft(emptyContact); setContactModal(true); }} onEdit={(contact) => { setContactDraft(contact); setContactModal(true); }} />}
        {screen === 'guardian' && <GuardianModeScreen profile={safe.profile} currentLocation={safe.currentLocation} locationStatus={safe.locationStatus} networkState={safe.networkState} contacts={safe.contacts} onToggle={(v)=>safe.setGuardianMode(v).catch((e)=>safe.setToast({type:'error',text:e.message}))} onRefreshLocation={safe.refreshCurrentLocation} onBack={()=>setScreen('home')} />}
        {screen === 'map' && <MapScreen activeAlert={safe.activeAlert} plan={safe.profile?.plan || 'basic'} networkIdentity={safe.networkIdentity} currentLocation={safe.currentLocation} locationStatus={safe.locationStatus} onRefreshLocation={safe.refreshCurrentLocation} t={t} language={language} />}
        {screen === 'sentinel' && <SentinelScreen networkIdentity={safe.networkIdentity} profile={safe.profile} currentLocation={safe.currentLocation} onRefreshLocation={safe.refreshCurrentLocation} onBack={() => setScreen('home')} onHome={() => setScreen('home')} onOpenChat={(conversation) => { setSelectedConversation(conversation); setScreen('chat'); }} sentinelOffer={safe.sentinelOffer} clearSentinelOffer={safe.clearSentinelOffer} setToast={safe.setToast} plan={safe.profile?.plan || 'basic'} />}
        {screen === 'device' && <DeviceScreen onBack={() => setScreen('home')} onHome={() => setScreen('home')} device={safe.device} telemetry={safe.telemetry} pairingState={safe.pairingState} onPair={() => safe.pairDevice().catch(()=>{})} connectionGuard={safe.connectionGuard} onConnectionGuard={safe.setConnectionGuard} connectionStatus={safe.connectionStatus} signalQuality={safe.signalQuality} trigger={safe.trigger} onTrigger={safe.setTrigger} t={t} />}
        {screen === 'activity' && <ActivityScreen activities={safe.activities} onClear={() => clearActivityFeed('activity')} t={t} language={language} />}

        {screen === 'messages' && (
          <MessagesScreen
            networkIdentity={safe.networkIdentity}
            onOpenChat={(conversation) => {
              setSelectedConversation(conversation);
              setScreen('chat');
            }}
          />
        )}

        {screen === 'chat' && (
          <ChatScreen
            conversation={selectedConversation}
            networkIdentity={safe.networkIdentity}
            messagePush={safe.messagePush}
            onBack={() => setScreen('messages')}
            onDeleted={() => setSelectedConversation(null)}
          />
        )}
        {screen === 'notifications' && <NotificationsScreen activities={safe.activities} onBack={()=>setScreen('home')} onClear={() => clearActivityFeed('notifications')} t={t} language={language} />}
        {screen === 'network' && <NetworkScreen profile={safe.profile} networkState={safe.networkState} qrDataUrl={safe.qrDataUrl} onScan={async () => { try { await safe.scanNetworkQr(); setScreen('home'); } catch (error) { safe.setToast({ type:'error', text:error.message }); } }} onRotate={() => safe.rotateQr().catch((error) => safe.setToast({ type:'error', text:error.message }))} onRemoveLink={(id) => safe.removeNetworkLink(id).catch((error) => safe.setToast({ type:'error', text:error.message }))} onRefresh={() => safe.refreshNetwork().catch(() => {})} t={t} />}
        {screen === 'resolved-alert' && <ResolvedAlertScreen alert={safe.resolvedAlert} onHome={()=>{safe.dismissResolvedAlert();setScreen('home')}} />}
        {screen === 'active-alert' && <ActiveAlertScreen
          alert={safe.activeAlert}
          networkIdentity={safe.networkIdentity}
          currentLocation={safe.currentLocation}
          onHome={() => setScreen('home')}
          onOpenChat={(conversation) => {
            setSelectedConversation(conversation);
            setScreen('chat');
          }}
          plan={safe.profile?.plan || 'basic'}
          onSafe={markSafe}
          busy={safe.busy}
          t={t}
          language={language}
        />}
        {screen === 'privacy' && <PrivacyCenterScreen profile={safe.profile} onNavigate={setScreen} onDeleteAccount={deleteAccount} t={t} />}
        {screen === 'settings' && <SettingsScreen profile={safe.profile} onSaveProfile={safe.saveProfile} armed={safe.armed} onArmed={safe.setArmed} onReset={resetAll} appearance={safe.appearance} onAppearance={safe.setAppearance} onDeleteAccount={deleteAccount} onSignOut={safe.signOut} networkState={safe.networkState} systemHealth={safe.systemHealth} onRefreshSystemHealth={safe.refreshSystemHealth} onTestEmail={safe.sendTestEmail} onTestAlarmSound={safe.testAlarmSound} onNavigate={setScreen} connectionGuard={safe.connectionGuard} onConnectionGuard={safe.setConnectionGuard} connectionStatus={safe.connectionStatus} t={t} />}
      </div></main>

      {showDock && <V4BottomNav active={screen} onChange={setScreen} t={t} />}
      <SideMenu open={drawer} onClose={() => setDrawer(false)} onNavigate={setScreen} active={screen} profile={safe.profile} device={safe.device} telemetry={safe.telemetry} connectionStatus={safe.connectionStatus} t={t} />
      <EmergencyDispatchOverlay open={safe.dispatchingAlert} stage={safe.dispatchStage} t={t} />
      <SOSActivation open={sosActivation && !safe.dispatchingAlert} onCancel={() => setSosActivation(false)} onConfirm={activateSOS} busy={safe.busy} t={t} />

      <Modal open={contactModal} title={contactDraft.id ? t('v4.guardian.edit') : t('v4.guardian.new')} onClose={() => setContactModal(false)} className="guardian-editor-sheet">
        <form className="modal-form guardian-modal-form" onSubmit={submitContact}>
          <label>{t('v4.guardian.name')}<input className="input" value={contactDraft.name} onChange={(e) => setContactDraft({ ...contactDraft, name:e.target.value })} placeholder={t('v4.guardian.namePlaceholder')} autoFocus /></label>
          <label>Email<input className="input" type="email" value={contactDraft.email} onChange={(e) => setContactDraft({ ...contactDraft, email:e.target.value })} placeholder="guardian@email.com" /></label>
          <label>{t('v4.guardian.phone')}<input className="input" type="tel" value={contactDraft.phone} onChange={(e) => setContactDraft({ ...contactDraft, phone:e.target.value })} placeholder="+39…" /></label>
          <label>{t('v4.guardian.role')}<select className="input" value={contactDraft.role||'guardian'} onChange={(e)=>setContactDraft({...contactDraft,role:e.target.value})}><option value="guardian">{t('v4.guardian.guardian')}</option><option value="primary">{t('v4.guardian.primary')}</option></select></label>
          <div className="guardian-permission-editor">
            {[['sosAlerts',t('v4.contacts.sos')],['liveLocation',t('v4.contacts.live')],['disconnectAlerts',t('v4.contacts.disconnect')]].map(([key,label])=><label key={key} className="permission-toggle"><span>{label}</span><input type="checkbox" checked={contactDraft.permissions?.[key]!==false} onChange={(e)=>setContactDraft({...contactDraft,permissions:{...contactDraft.permissions,[key]:e.target.checked}})}/></label>)}
          </div>
          <button className="v4-primary" type="submit">{t('v4.guardian.save')}</button>
          {contactDraft.id && <button className="danger-outline full" type="button" onClick={async () => { await safe.removeContact(contactDraft.id); setContactModal(false); setContactDraft(emptyContact); }}>{t('v4.guardian.delete')}</button>}
        </form>
      </Modal>

      <Toast toast={safe.toast} onClose={() => safe.setToast(null)} t={t} />
      <AlertResult alert={result} onClose={() => setResult(null)} t={t} language={language} />
      <IncomingAlert alert={safe.incomingAlert} onClose={() => safe.setIncomingAlert(null)} t={t} language={language} />
    </div>
  );
}
