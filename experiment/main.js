import { createSignal, createMemo, createEffect, onCleanup } from 'solid-js';
import { render } from '@solidjs/web';
import { getGameItems } from '../config/constants.ts';
import { getStrings } from '../i18n/index.ts';
import { getNeighbors, getQuizOptions, LOCAL_RHYMES } from '../gameEngine.ts';
import { GameUIController, getGameSettings } from '../shared/videogames-kit/src/integration.js';
import { SpinClock, spinTarget, TAU, normalizeAngle } from './spin.js';
import '../shared/videogames-kit/styles/game-ui.css';
import '../shared/videogames-kit/styles/integration.css';
import './style.css';

function Game() {
  const settings = getGameSettings('ruota-del-tempo');
  const [preferences, setPreferences] = createSignal(settings.getSnapshot());
  const [mode, setMode] = createSignal('DAYS');
  const [phase, setPhase] = createSignal('ready');
  const [winner, setWinner] = createSignal(null);
  const [before, setBefore] = createSignal(null), [after, setAfter] = createSignal(null);
  const [feedback, setFeedback] = createSignal('');
  const [angle, setAngle] = createSignal(0);
  const [paused, setPaused] = createSignal(false);
  const [rendererMode, setRendererMode] = createSignal('loading');
  const [manualPause, setManualPause] = createSignal(false);
  const lang = createMemo(() => preferences().language.toUpperCase());
  const english = () => lang() === 'EN';
  const t = () => getStrings(lang());
  const items = createMemo(() => getGameItems(mode(), lang()));
  const selected = () => items().find(item => item.id === winner());
  const neighbors = () => getNeighbors(items().findIndex(item => item.id === winner()), items());
  const options = createMemo(() => selected() ? getQuizOptions(selected(), items(), preferences().difficulty.toUpperCase()) : []);
  const rhyme = () => LOCAL_RHYMES[lang()][selected()?.label] || '';
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let canvas, controls, heading, wheel, clock, frame = 0, disposed = false, resultIndex;
  let currentAngle = 0;
  const paint = value => { currentAngle = value; setAngle(value); wheel?.setAngle(value); };
  const pause = () => {
    setPaused(true); clock?.pause(performance.now()); cancelAnimationFrame(frame);
  };
  const resume = () => {
    setPaused(false);
    if (clock) { clock.resume(performance.now()); frame = requestAnimationFrame(tick); }
  };
  const kit = new GameUIController({ gameId: 'ruota-del-tempo', root: document.getElementById('root'), onOpen: pause, onClose: resume });
  const tick = now => {
    if (disposed || paused() || !clock) return;
    const sample = clock.sample(now); paint(sample.angle);
    if (!sample.done) { frame = requestAnimationFrame(tick); return; }
    clock = undefined; paint(normalizeAngle(currentAngle));
    setWinner(items()[resultIndex].id); setPhase('question');
    kit.audio.tone({frequencies:[660,880],duration:.1});
    kit.audio.speak(items()[resultIndex].label, {language:english()?'en-GB':'it-IT'});
  };
  const spin = () => {
    if (phase() !== 'ready' || paused()) return;
    setBefore(null); setAfter(null); setFeedback(''); setWinner(null);
    resultIndex = Math.floor(Math.random() * items().length);
    const reduced = preferences().motion === 'reduced' || (preferences().motion === 'system' && motionQuery.matches);
    clock = new SpinClock({from:currentAngle,to:spinTarget(currentAngle,resultIndex,items().length),duration:reduced?120:3600,now:performance.now()});
    setPhase('spinning'); kit.audio.tone({frequencies:[330,440,550],duration:.08});
    frame = requestAnimationFrame(tick);
  };
  const reset = () => {
    cancelAnimationFrame(frame); clock = undefined; kit.audio.stop();
    setPhase('ready'); setWinner(null); setBefore(null); setAfter(null); setFeedback(''); paint(0);
  };
  const changeMode = value => { if (phase() === 'ready' && !paused()) { setMode(value); paint(0); } };
  const choose = id => {
    if (paused() || phase() !== 'question') return;
    setFeedback('');
    if (before() === null) setBefore(id); else if (after() === null && before() !== id) setAfter(id);
    kit.audio.tone({frequencies:[440],duration:.05});
  };
  const check = () => {
    if (paused() || before() === null || after() === null || phase() !== 'question') return;
    if (before() === neighbors().prev.id && after() === neighbors().next.id) {
      setPhase('success'); kit.audio.tone({frequencies:[523,659,784,1046],duration:.15});
    } else {
      setFeedback(english()?'Almost! Try again: you can clear either answer.':'Quasi! Riprova: puoi cancellare ciascuna risposta.');
      kit.audio.tone({frequencies:[220,165],duration:.13});
    }
  };
  const unwatch = settings.subscribe(() => setPreferences(settings.getSnapshot()));
  // Reuse the same preference store and settings UI as the React entry, without mounting React.
  createEffect(() => true, () => { controls.append(kit.controls); });
  createEffect(() => items(), value => { wheel?.setItems(value); wheel?.setAngle(currentAngle); });
  createEffect(() => [lang(), preferences().difficulty], () => { setBefore(null); setAfter(null); setFeedback(''); });
  createEffect(() => phase(), value => {
    if ((value === 'question' || value === 'success') && !paused()) heading?.focus();
  });
  const fallback = reason => {
    wheel?.dispose(); wheel = undefined; setRendererMode(reason);
  };
  const initializeWheel = async () => {
    const value = canvas;
    if (!value) return;
    try {
      const {createWheel} = await import('./wheel.js');
      if (disposed) return;
      wheel = createWheel(value, () => fallback('fallback'));
      wheel.setItems(items()); wheel.setAngle(currentAngle); setRendererMode('3d');
    } catch (error) {
      // Rendering is optional: rules and all controls remain available through SVG.
      if (!disposed) { fallback('fallback'); document.getElementById('root').dataset.rendererFailure = error.name; }
    }
  };
  createEffect(() => true, () => { void initializeWheel(); });
  const pagehide = event => { if (event.persisted) kit.lifecycle.pause('pagehide'); else dispose(); };
  const pageshow = event => { if (event.persisted) kit.lifecycle.resume('pagehide'); };
  window.addEventListener('pagehide', pagehide); window.addEventListener('pageshow', pageshow);
  onCleanup(() => {
    disposed = true; cancelAnimationFrame(frame); clock = undefined; unwatch(); wheel?.dispose();
    window.removeEventListener('pagehide', pagehide); window.removeEventListener('pageshow', pageshow);
    void kit.dispose().catch(error => console.error('Game cleanup:',error));
  });
  const label = id => items().find(item => item.id === id)?.label || '?';
  const sector = index => {
    const step = TAU / items().length, a = -Math.PI/2 + (index-.5)*step, b = a+step;
    return `M200 200L${200+182*Math.cos(a)} ${200+182*Math.sin(a)} A182 182 0 0 1 ${200+182*Math.cos(b)} ${200+182*Math.sin(b)}Z`;
  };
  return <div class="trial-app" data-renderer={rendererMode()} data-phase={phase()}>
    <header class="trial-header">
      <a class="trial-brand" href="/index.html" aria-label={english()?'GiraTempo classic':'GiraTempo classico'}><span aria-hidden="true">✦</span> GiraTempo<span class="trial-badge">3D</span></a>
      <div class="trial-toolbar"><button type="button" onClick={() => { const next=!manualPause(); setManualPause(next); if(next)kit.lifecycle.pause('manual');else kit.lifecycle.resume('manual'); }} aria-pressed={String(manualPause())}>{manualPause()?(english()?'Resume':'Riprendi'):(english()?'Pause':'Pausa')}</button><div ref={controls}/></div>
    </header>
    <div class="trial-pause" role="status" hidden={!paused()}>{english()?'Game paused. Your spin is safe.':'Gioco in pausa. Il tuo giro ti aspetta.'}</div>
    <main class="trial-layout" inert={paused()}>
      <section class="trial-stage" aria-label={english()?'Wheel':'Ruota'}>
        <p class="trial-eyebrow">{english()?'A little spin, a big discovery':'Un piccolo giro, una grande scoperta'}</p>
        <h1>{english()?'What comes next?':'E dopo, cosa viene?'}</h1>
        <div class="trial-wheel" aria-hidden="true">
          <canvas ref={canvas} hidden={rendererMode()!=='3d'}/>
          <svg viewBox="0 0 400 400" hidden={rendererMode()==='3d'}>
            <g style={{'transform-origin':'200px 200px',transform:`rotate(${-angle()*180/Math.PI}deg)`}}>
              {items().map((item,index)=><g><path d={sector(index)} fill={item.color} stroke="#fff" stroke-width="2"/><text transform={`rotate(${index*360/items().length} 200 200)`} x="200" y="76" text-anchor="middle" fill="#14213b" stroke="#fff" stroke-width="3" paint-order="stroke" font-size={items().length>7?'12':'15'} font-weight="800">{item.label}</text></g>)}
              <circle cx="200" cy="200" r="24" fill="#fff4c2" stroke="#18243c" stroke-width="4"/>
            </g><path d="M187 9H213L200 36Z" fill="#e94662" stroke="#18243c" stroke-width="3"/>
          </svg>
          <span class="trial-orbit" aria-hidden="true">✦</span>
        </div>
        <p class="trial-renderer" role="status">{rendererMode()==='loading'?(english()?'Preparing your wheel…':'Preparo la tua ruota…'):rendererMode()==='fallback'?(english()?'2D wheel active. You can keep playing.':'Ruota 2D attiva. Puoi continuare a giocare.'):(english()?'Your next adventure is one spin away.':'La prossima avventura è a un giro da te.')}</p>
      </section>
      <section class="trial-card" aria-label={english()?'Play':'Gioca'}>
        <div class="trial-mode" role="group" aria-label={t().learnTitle}>
          <button type="button" data-mode="DAYS" aria-pressed={String(mode()==='DAYS')} disabled={phase()!=='ready'} onClick={()=>changeMode('DAYS')}>{t().days}</button>
          <button type="button" data-mode="MONTHS" aria-pressed={String(mode()==='MONTHS')} disabled={phase()!=='ready'} onClick={()=>changeMode('MONTHS')}>{t().months}</button>
        </div>
        <h2 ref={heading} tabIndex="-1" class="trial-question">{phase()==='ready'?(english()?'Ready to discover?':'Pronti a scoprire?'):phase()==='spinning'?(english()?'Here we go!':'Si gira!'):phase()==='success'?t().success:t().quizQuestion(selected()?.label || '')}</h2>
        <p class="trial-instruction">{phase()==='ready'?(english()?'Spin the wheel, then find what comes before and after.':'Gira la ruota, poi trova chi viene prima e chi viene dopo.'):phase()==='spinning'?(english()?'Watch the pointer…':'Occhio alla freccia…'):phase()==='question'?(english()?'Choose the previous item first, then the next. Tap an answer to clear it.':'Scegli prima il precedente, poi il successivo. Tocca una risposta per cancellarla.'):rhyme()}</p>
        <div hidden={phase()!=='question'}>
          <div class="trial-answers">
            <div><span>{t().before}</span><button type="button" data-answer="before" onClick={()=>{setBefore(null);setFeedback('');}} aria-label={`${t().before}: ${label(before())}`}>{label(before())}</button></div>
            <div><span>{t().todayIs}</span><strong data-winner={winner()}>{selected()?.label || '—'}</strong></div>
            <div><span>{t().after}</span><button type="button" data-answer="after" onClick={()=>{setAfter(null);setFeedback('');}} aria-label={`${t().after}: ${label(after())}`}>{label(after())}</button></div>
          </div>
          <p class="trial-hint" hidden={preferences().difficulty!=='easy'}>{english()?'A little help':'Un piccolo aiuto'}: {selected()?`${neighbors().prev.label} → ${selected().label} → ${neighbors().next.label}`:''}</p>
          <div class="trial-options">{options().map(item=><button type="button" data-option={item.id} aria-pressed={String(before()===item.id||after()===item.id)} disabled={before()===item.id||after()===item.id} onClick={()=>choose(item.id)}>{item.label}</button>)}</div>
          <p class="trial-feedback" role="status">{feedback()}</p>
          <button type="button" class="trial-primary" data-check disabled={before()===null||after()===null} onClick={check}>{t().check}</button>
        </div>
        <button type="button" class="trial-primary" data-spin hidden={phase()!=='ready'&&phase()!=='spinning'} disabled={phase()==='spinning'} onClick={spin}>{phase()==='spinning'?t().spinning:t().spinBtn}<span aria-hidden="true"> ↗</span></button>
        <div class="trial-success" hidden={phase()!=='success'}>
          <span class="trial-stars" aria-hidden="true">✦ ★ ✦</span>
          <button type="button" class="trial-primary" data-again onClick={reset}>{t().spinAgain}</button>
          <button type="button" class="trial-secondary" onClick={()=>kit.audio.speak(rhyme(),{language:english()?'en-GB':'it-IT'})}>{t().listenAgain}</button>
        </div>
        <button type="button" class="trial-back" hidden={phase()==='ready'||phase()==='spinning'} onClick={reset}>{english()?'Change mode':'Cambia modalità'}</button>
      </section>
    </main>
    <footer class="trial-footer"><span>{english()?'Learn by playing, one day at a time.':'Imparare giocando, un giorno alla volta.'}</span><a href="/index.html">{english()?'Classic version':'Versione classica'} ↗</a></footer>
  </div>;
}
const dispose = render(() => <Game/>, document.getElementById('root'));
if (import.meta.hot) import.meta.hot.dispose(dispose);
