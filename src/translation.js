import dictionary from './translations-es.json';
const normalize=s=>s.trim().replace(/\s+/g,' ');
const lookup=new Map(Object.entries(dictionary).map(([a,b])=>[normalize(a),b]));
export function initTranslation(language){
 document.documentElement.lang=language;
 if(language!=='es')return()=>{};
 const changed=new Map();let pending=false;
 function visit(root){if(root.nodeType===3){const old=root.nodeValue,key=normalize(old);const translated=lookup.get(key);if(translated&&translated!==key){changed.set(root,old);root.nodeValue=old.replace(old.trim(),translated)}return}if(root.nodeType!==1||root.closest('[data-no-translate],script,style,svg,video,.jm-review-widget,.j-clinician-reviews'))return;for(const child of root.childNodes)visit(child)}
 const observer=new MutationObserver(()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;observer.disconnect();visit(document.getElementById('root'));observer.observe(document.getElementById('root'),{subtree:true,childList:true,characterData:true})})});visit(document.getElementById('root'));observer.observe(document.getElementById('root'),{subtree:true,childList:true,characterData:true});return()=>{observer.disconnect();for(const [node,text] of changed)if(node.isConnected&&lookup.get(normalize(text))===normalize(node.nodeValue))node.nodeValue=text;document.documentElement.lang='en'};
}
