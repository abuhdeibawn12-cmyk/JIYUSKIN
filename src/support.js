export function initSupport(open){
 const root=document.querySelector('.j-support-page');if(!root)return()=>{};
 root.querySelectorAll('input[type=email]').forEach(i=>i.required=true);
 const claim=root.querySelector('.wenexus-submit');if(claim){const update=()=>{claim.disabled=!root.querySelector('#emailPhone')?.value.trim()||!root.querySelector('#orderNumber')?.value.trim()};root.addEventListener('input',update)}
 function action(e){const t=e.target.closest('button,input[type=button]');if(!t)return;
  if(t.hasAttribute('aria-controls')){const target=document.getElementById(t.getAttribute('aria-controls'));if(target){const isOpen=t.getAttribute('aria-expanded')!=='true';t.setAttribute('aria-expanded',String(isOpen));target.style.display=isOpen?'block':'none';if(isOpen)target.querySelector('input')?.focus();return}}
  if(t.id.includes('update-privacy-settings')){open({title:'Privacy settings',privacySettings:true});return}
  if(t.type==='button'&&t.id.includes('request-submit')){const f=t.closest('form');if(f?.reportValidity())open({title:'Request preview',text:'Your privacy request preview is complete. No request was sent and no personal information was stored.'})}
  if(t.matches('.slider-button')){const track=root.querySelector('[id^="Slider-"]');track?.scrollBy({left:(t.name==='previous'?-1:1)*track.clientWidth,behavior:'smooth'});root.querySelectorAll('.slider-button').forEach(b=>b.disabled=false)}
 }
 function submit(e){if(!root.contains(e.target))return;e.preventDefault();open({title:e.target.classList.contains('form')?'Claim preview':'Request preview',text:e.target.classList.contains('form')?'This assignment cannot look up live orders. Your claim form preview is complete; no claim was filed.':'Your privacy request preview is complete. No request was sent and no personal information was stored.'})}
 root.addEventListener('click',action);root.addEventListener('submit',submit);return()=>{root.removeEventListener('click',action);root.removeEventListener('submit',submit)}
}
