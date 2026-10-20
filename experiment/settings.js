import {createSignal,createEffect,onCleanup} from 'solid-js';
import {AppearanceController,AudioManager,FullscreenController,GameLifecycleController,InputManager,UI_MESSAGES,getGameProfile} from '../shared/videogames-kit/src/index.js';

/** Solid owns menu markup; the shared kit owns persistence and platform services. */
export function createSolidGameUI({settings,preferences,onPause,onResume}) {
  const root=document.getElementById('root'),profile=getGameProfile('ruota-del-tempo');
  const [opened,setOpened]=createSignal(false),[confirmation,setConfirmation]=createSignal(false);
  const [full,setFull]=createSignal(false),[error,setError]=createSignal('');
  const [revision,setRevision]=createSignal(0);
  const media=matchMedia('(prefers-color-scheme: dark)');
  const [systemDark,setSystemDark]=createSignal(media.matches);
  const audio=new AudioManager(),fullscreen=new FullscreenController(root),appearance=new AppearanceController(root,settings);
  const lifecycle=new GameLifecycleController({audio,onPause,onResume});
  const messages={it:{...UI_MESSAGES.it,medium:'Difficile',...profile.messages.it},en:{...UI_MESSAGES.en,medium:'Hard',...profile.messages.en}};
  const t=key=>messages[preferences().language][key]??key;
  let element,settingsButton,closeButton,resetButton,cancelButton,opener,frame,disposed=false;
  const previous={dark:document.documentElement.classList.contains('dark'),lang:document.documentElement.lang,game:root.classList.contains('ag-game'),host:root.classList.contains('ag-kit-host')};
  root.classList.add('ag-game','ag-kit-host');root.dataset.kitIntegrated='ruota-del-tempo';
  const close=()=>{if(element?.open)element.close();};
  const closed=()=>{
    if(disposed)return;
    setOpened(false);setConfirmation(false);lifecycle.resume('settings');
    if(opener?.isConnected)opener.focus();
  };
  const open=(source=settingsButton)=>{
    if(disposed)throw new Error('Solid settings disposed');
    if(element.open)return;
    opener=source;setConfirmation(false);lifecycle.pause('settings');
    try{element.showModal();setOpened(true);closeButton.focus();}
    catch(cause){lifecycle.resume('settings');throw new Error('Could not open Solid settings',{cause});}
  };
  const saveStatus=()=>{revision();preferences();return settings.status;};
  const locked=key=>saveStatus()==='future'||(profile.channels.includes(key)&&preferences().muted);
  const update=(key,value)=>{
    try{settings.update({[key]:value});setRevision(value=>value+1);setError('');}
    catch(cause){setError('settingsError');console.error('Solid preference update:',cause);}
  };
  const reset=()=>{
    try{settings.reset();setRevision(value=>value+1);setError('');setConfirmation(false);queueMicrotask(()=>resetButton.focus());}
    catch(cause){setError('settingsError');console.error('Solid preference reset:',cause);}
  };
  const fieldOptions=values=>values.map(value=>({value,label:value}));
  function Field(props){
    return <label class="ag-field"><span>{t(props.name)}</span>{props.options?
      <select name={props.name} data-setting={props.name} value={preferences()[props.name]} disabled={locked(props.name)} onChange={event=>update(props.name,event.currentTarget.value)}>
        {props.options.map(option=><option value={option.value}>{option.text??t(option.label)}</option>)}
      </select>:
      <input type="checkbox" name={props.name} data-setting={props.name} checked={preferences()[props.name]} disabled={locked(props.name)} onChange={event=>update(props.name,event.currentTarget.checked)}/>}</label>;
  }
  function Controls(){
    return <div class="ag-kit-controls" data-ui-framework="solid-2">
      <button type="button" class="ag-button" ref={settingsButton} data-kit-settings aria-haspopup="dialog" aria-controls="solid-settings" aria-expanded={String(opened())} onClick={()=>open(settingsButton)}>{t('settings')}</button>
      <button type="button" class="ag-button" data-kit-fullscreen aria-pressed={String(full())} onClick={()=>{void fullscreen.toggle().catch(cause=>console.error('Solid fullscreen:',cause));}}>{t(full()?'exitFullscreen':'fullscreen')}</button>
    </div>;
  }
  const focusables=()=>[...element.querySelectorAll('button:not(:disabled),select:not(:disabled),input:not(:disabled),a[href]')].filter(node=>!node.closest('[hidden]'));
  const keydown=event=>{
    if(event.key==='Escape'&&confirmation()){event.preventDefault();setConfirmation(false);queueMicrotask(()=>resetButton.focus());return;}
    if(event.key!=='Tab')return;
    const nodes=focusables(),first=nodes[0],last=nodes.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  };
  function Settings(){
    return <dialog ref={node=>{element=node;node.addEventListener('keydown',keydown);onCleanup(()=>node.removeEventListener('keydown',keydown));}} id="solid-settings" class="ag-dialog" data-kit-dialog="ruota-del-tempo" data-ui-framework="solid-2" lang={preferences().language} aria-labelledby="solid-settings-title" aria-describedby="solid-settings-hint" onClose={closed} onCancel={event=>{if(confirmation()){event.preventDefault();setConfirmation(false);queueMicrotask(()=>resetButton.focus());}}}>
      <header class="ag-topbar ag-dialog-header"><h2 id="solid-settings-title" class="ag-title">{t('settings')}</h2><button type="button" ref={closeButton} class="ag-button ag-button--quiet" onClick={close}>{t('close')}</button></header>
      <p id="solid-settings-hint" class="ag-status">{t('settingsHint')}</p>
      <fieldset class="ag-settings-group"><legend>{t('displayGroup')}</legend>
        <Field name="language" options={[{value:'it',text:'Italiano'},{value:'en',text:'English'}]}/>
        <Field name="theme" options={fieldOptions(['system','light','dark'])}/>
      </fieldset>
      <fieldset class="ag-settings-group"><legend>{t('audioGroup')}</legend><Field name="muted"/>{profile.channels.map(channel=><Field name={channel}/>)}</fieldset>
      <fieldset class="ag-settings-group"><legend>{t('playGroup')}</legend><Field name="difficulty" options={fieldOptions(profile.difficulties)}/></fieldset>
      <fieldset class="ag-settings-group"><legend>{t('accessibilityGroup')}</legend><Field name="motion" options={fieldOptions(['system','reduced'])}/><Field name="contrast" options={fieldOptions(['normal','high'])}/></fieldset>
      <div class="ag-reset-confirm" hidden={!confirmation()} role="group" aria-labelledby="solid-reset-question">
        <p id="solid-reset-question">{t('resetAsk')}</p>
        <button type="button" ref={cancelButton} class="ag-button" onClick={()=>{setConfirmation(false);queueMicrotask(()=>resetButton.focus());}}>{t('cancel')}</button>
        <button type="button" class="ag-button ag-button--danger" data-confirm-reset onClick={reset}>{t('confirmReset')}</button>
      </div>
      <p class="ag-status" role="status" aria-live="polite" aria-atomic="true" data-storage={saveStatus()}>{t(error()||(['empty','memory','future','invalid'].includes(saveStatus())?saveStatus():'saved'))}</p>
      <footer class="ag-dialog-footer"><button type="button" ref={resetButton} class="ag-button ag-button--quiet" data-reset-settings disabled={saveStatus()==='future'} onClick={()=>{setConfirmation(true);queueMicrotask(()=>cancelButton.focus());}}>{t('reset')}</button><button type="button" class="ag-button ag-button--primary" onClick={close}>{t('done')}</button></footer>
    </dialog>;
  }
  createEffect(()=>[preferences(),systemDark()],([value,dark])=>{
    document.documentElement.classList.toggle('dark',value.theme==='system'?dark:value.theme==='dark');
    document.documentElement.lang=value.language;audio.setPreferences(value);
  });
  const change=()=>setSystemDark(media.matches);media.addEventListener('change',change);
  const offFullscreen=fullscreen.subscribe(setFull);
  const gesture=event=>{if(event.isTrusted&&!settings.getSnapshot().muted)void audio.unlock();};
  root.addEventListener('pointerdown',gesture,true);root.addEventListener('keydown',gesture,true);
  // Input polling remains in the platform layer; all visible controls are Solid.
  const input=new InputManager({keys:{},gamepad:{previous:{axis:1,direction:-1,buttons:[12]},next:{axis:1,direction:1,buttons:[13]},left:{buttons:[14]},right:{buttons:[15]},confirm:{buttons:[0]},back:{buttons:[1]},settings:{buttons:[8]}}});
  let previousInput={};
  const poll=()=>{
    if(disposed)return;
    const value=input.poll(),pressed=key=>value[key]&&!previousInput[key];
    if(pressed('settings')){if(element.open)close();else open();}
    if(element?.open){
      const nodes=focusables(),active=document.activeElement,index=nodes.indexOf(active);
      if(pressed('previous'))nodes[(index-1+nodes.length)%nodes.length]?.focus();
      if(pressed('next'))nodes[(index+1)%nodes.length]?.focus();
      if((pressed('left')||pressed('right'))&&active?.tagName==='SELECT'){
        active.selectedIndex=(active.selectedIndex+(pressed('right')?1:-1)+active.options.length)%active.options.length;
        active.dispatchEvent(new Event('change',{bubbles:true}));
      }
      if(pressed('confirm')&&active?.tagName!=='SELECT')active?.click();
      if(pressed('back'))close();
    }
    previousInput=value;frame=requestAnimationFrame(poll);
  };
  createEffect(()=>true,()=>{frame=requestAnimationFrame(poll);});
  const kit={settings,root,audio,fullscreen,lifecycle,appearance,open,dialog:{get element(){return element;},get confirming(){return confirmation();},open,close},get settingsButton(){return settingsButton;},
    async dispose(){
      if(disposed)return;disposed=true;cancelAnimationFrame(frame);input.dispose();
      lifecycle.dispose();offFullscreen();appearance.dispose();media.removeEventListener('change',change);
      root.removeEventListener('pointerdown',gesture,true);root.removeEventListener('keydown',gesture,true);
      if(element?.open)element.close();
      if(!previous.game)root.classList.remove('ag-game');if(!previous.host)root.classList.remove('ag-kit-host');delete root.dataset.kitIntegrated;
      document.documentElement.classList.toggle('dark',previous.dark);document.documentElement.lang=previous.lang;
      if(window.__gameKit===kit)delete window.__gameKit;
      await Promise.all([fullscreen.dispose(),audio.dispose()]);
    }};
  window.__gameKit=kit;
  return {kit,Controls,Settings};
}
