import React, {useEffect, useRef, useState} from 'react';

const origin = 'https://app.thefrontrowhealth.com';
const reviewsUrl = `${origin}/api/widgets?presentation_type=qual&bundle_id=29`;
const dialogs = {
  reviews: `${origin}/api/widgets/testimonials?presentation_type=qual&bundle_id=29`,
  profile: `${origin}/api/widgets/v1/provider_profiles?widget_id=10712`,
};

const reserveHeight=()=>{const width=window.innerWidth;try{const saved=Number(sessionStorage.getItem('jiyu-clinician-height-'+width));if(saved>600)return saved}catch{}const samples=width<=768?[[320,1984],[390,1894],[768,1745]]:[[769,1450],[842,1374],[1024,1211],[1280,1095],[1440,1095]];if(width<=samples[0][0])return samples[0][1];for(let i=1;i<samples.length;i++){const [x,y]=samples[i],[px,py]=samples[i-1];if(width<=x)return Math.round(py+(y-py)*(width-px)/(x-px))}return samples.at(-1)[1]};
// Use the same two-product evaluation widget as the original homepage.
export default function ClinicianReviews() {
  const frame = useRef(null), modalFrame = useRef(null), closeButton = useRef(null);
  const [height, setHeight] = useState(reserveHeight);
  const [stack, setStack] = useState([]);
  const ready=useRef(false);const [failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{const resize=()=>setHeight(reserveHeight());window.addEventListener('resize',resize);const timeout=setTimeout(()=>{if(!ready.current)setFailed(true)},12000);return()=>{clearTimeout(timeout);window.removeEventListener('resize',resize)}},[attempt]);
  const active = stack.at(-1);
  const close = () => setStack(items => items.slice(0, -1));

  useEffect(() => {
    function receive(event) {
      if (event.origin !== origin) return;
      const fromReviews = event.source === frame.current?.contentWindow;
      const fromDialog = event.source === modalFrame.current?.contentWindow;
      if (!fromReviews && !fromDialog) return;
      const data = event.data;
      if (fromReviews && data?.name === 'QUAL_REQUEST_READY_STATUS') {
        event.source.postMessage({name: 'PARENT_READY'}, origin);
      } else if (fromReviews && data?.name === 'RESIZE_TESTIMONIALS_HEIGHT' && Number.isFinite(data.value) && data.value>600) {
        ready.current=true;setFailed(false);setHeight(Math.max(200, Math.min(10000, data.value)));try{sessionStorage.setItem('jiyu-clinician-height-'+window.innerWidth,String(data.value))}catch{}
      } else if (data?.name === 'OPEN_TESTIMONIALS_MODAL') {
        setStack([{type: 'reviews', message: {name: 'SCROLL_TO_REVIEW', value: data.value}}]);
      } else if (data?.name === 'OPEN_PROVIDER_MODAL_FROM_TESTIMONIALS') {
        setStack(items => [...items, {type: 'profile', message: {name: 'OPEN', data: data.data}}]);
      } else if (fromDialog && data === 'CLOSE_ALL_MODALS') {
        setStack([]);
      } else if (fromDialog && typeof data === 'string' && data.startsWith('CLOSE')) {
        close();
      }
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  useEffect(() => {
    if (!active) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
      if (event.key === 'Tab' && event.shiftKey && document.activeElement === closeButton.current) {
        event.preventDefault(); modalFrame.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey, true);
      frame.current?.focus();
    };
  }, [active]);

  return <>
    <section className="j-clinician-reviews" aria-label="Independent clinician evaluations">
      <iframe key={attempt} ref={frame} style={{height:failed?0:height}} src={reviewsUrl}
        title="Independent clinician evaluations of JIYU toner pads and moisturizing cream"
        loading="eager" onLoad={() => frame.current?.contentWindow?.postMessage({name: 'PARENT_READY'}, origin)}/>
      {failed&&<div className="j-clinician-fallback"><h2>Independent Clinician Evaluations</h2><p>The clinician reviews are temporarily unavailable.</p><button onClick={()=>{ready.current=false;setFailed(false);setAttempt(v=>v+1)}}>Try again</button></div>}
    </section>
    {active && <div className="j-clinician-modal" role="dialog" aria-modal="true"
      aria-label={active.type === 'profile' ? 'Clinician profile' : 'Full clinician evaluations'}>
      <button ref={closeButton} className="j-clinician-modal-close" aria-label="Close clinician details" onClick={close}>×</button>
      <iframe key={active.type} ref={modalFrame} src={dialogs[active.type]}
        title={active.type === 'profile' ? 'Clinician profile' : 'Full clinician evaluations'}
        onLoad={() => modalFrame.current?.contentWindow?.postMessage(active.message, origin)}/>
    </div>}
  </>;
}
