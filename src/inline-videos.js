export function initInlineVideos(){
 const players=new Map();let activeCard=null;
 const update=(card,state)=>{const playing=!state.video.paused&&!state.video.ended;card.classList.toggle('j-inline-playing',playing);card.setAttribute('aria-label',playing?'Pause video':'Play video');card.setAttribute('aria-pressed',String(playing));if(!state.wantsPlay)card.classList.remove('j-inline-loading')};
 const pause=(card,state)=>{state.wantsPlay=false;if(activeCard===card)activeCard=null;state.video.pause();update(card,state)};
 const pauseAll=()=>{for(const [card,state] of players)pause(card,state)};
 const canPlay=card=>!document.hidden&&card.isConnected&&![...document.querySelectorAll('[aria-modal="true"]')].some(e=>e.getClientRects().length);
 const play=(card,state)=>{if(!state.ready||!state.wantsPlay||activeCard!==card)return;if(!canPlay(card)){pause(card,state);return}state.video.play().catch(error=>{if(!state.wantsPlay)return;if(error.name==='AbortError')return;pause(card,state);card.querySelector('.j-video-status').textContent='Tap to play video.'})};
 const observer=new IntersectionObserver(entries=>entries.forEach(e=>{const state=players.get(e.target);if(!e.isIntersecting&&state)pause(e.target,state)}),{threshold:.05});
 function toggle(card){
  let state=players.get(card);
  if(!state){
   const video=document.createElement('video');video.className='j-inline-video';video.playsInline=true;video.preload='metadata';video.poster=card.querySelector('img')?.src||'';card.prepend(video);
   const status=document.createElement('span');status.className='j-video-status';status.setAttribute('role','status');card.append(status);
   state={video,hls:null,wantsPlay:false,ready:false,started:false};players.set(card,state);observer.observe(card);
   video.addEventListener('play',()=>{if(!state.wantsPlay||activeCard!==card||!canPlay(card)){pause(card,state);return}update(card,state)});
   video.addEventListener('playing',()=>{state.started=true;card.classList.add('j-inline-loaded');card.classList.remove('j-inline-loading');status.textContent='';update(card,state)});
   video.addEventListener('pause',()=>{if(state.started&&video.paused)state.wantsPlay=false;update(card,state)});
   video.addEventListener('ended',()=>pause(card,state));
   video.addEventListener('waiting',()=>{if(state.wantsPlay)card.classList.add('j-inline-loading')});
   video.addEventListener('error',()=>{pause(card,state);status.textContent='Video unavailable. Tap to retry.'});
   const src=card.dataset.videoSrc;
   if(src?.includes('.m3u8')&&window.Hls?.isSupported()){
    state.hls=new window.Hls({maxBufferLength:30});
    state.hls.on(window.Hls.Events.MANIFEST_PARSED,()=>{state.ready=true;play(card,state)});
    state.hls.on(window.Hls.Events.ERROR,(_,info)=>{if(info.fatal){pause(card,state);status.textContent='Video unavailable. Tap to retry.'}});
    state.hls.loadSource(src);state.hls.attachMedia(video);
   }else{video.src=src;state.ready=true;}
  }
  if(state.wantsPlay){pause(card,state);return}
  pauseAll();for(const other of document.querySelectorAll('video'))if(other!==state.video)other.pause();
  state.wantsPlay=true;activeCard=card;card.classList.add('j-inline-loading');play(card,state);
 }
 const click=e=>{const card=e.target.closest('.video_card,.video_card_slider,[data-product-video]');if(card){e.preventDefault();toggle(card)}};
 const key=e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('.video_card,.video_card_slider')){e.preventDefault();toggle(e.target)}};
 const visibility=()=>{if(document.hidden)pauseAll()};
 document.addEventListener('click',click);document.addEventListener('keydown',key);document.addEventListener('visibilitychange',visibility);document.addEventListener('jiyu:pause-videos',pauseAll);
 return()=>{document.removeEventListener('click',click);document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('jiyu:pause-videos',pauseAll);observer.disconnect();pauseAll();for(const [card,{video,hls}] of players){hls?.destroy();video.remove();card.querySelector('.j-video-status')?.remove();card.classList.remove('j-inline-loaded','j-inline-playing','j-inline-loading')}}
}
