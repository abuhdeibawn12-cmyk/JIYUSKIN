import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'vite';
const require=createRequire(import.meta.url);
const viteRequire=createRequire(require.resolve('vite'));
const {parseAst}=viteRequire('rollup/parseAst');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.resolve(process.argv[2]||path.join(root,'dist/shopify-theme'));
const stage=path.join(root,'dist/shopify-stage');
fs.mkdirSync(stage,{recursive:true});
for(const d of ['src','shopify-src'])fs.cpSync(path.join(root,d),path.join(stage,d),{recursive:true});
if(!fs.existsSync(path.join(stage,'node_modules')))fs.symlinkSync(path.join(root,'node_modules'),path.join(stage,'node_modules'));
let app=fs.readFileSync(path.join(stage,'src/App.jsx'),'utf8');
app="import {useShopifyCart,hasSellingPlan} from '../shopify-src/commerce.jsx';\n"+app;
app=app.replace(/ const \[cart,setCart\]=useState\(.*?\);\n/," const [cart,setCart,cartBusy,shopifyCheckout]=useShopifyCart(setNotice);\n");
app=app.replace("function navigate(path){","function navigate(path){if(path==='/checkout'){shopifyCheckout().catch(e=>setNotice(e.message));return}if(path.startsWith('/account')){location.assign(window.JIYU_THEME.accountUrl);return}");
app=app.replaceAll("setModal({title:'Account',account:true})","location.assign(window.JIYU_THEME.accountUrl)");
app=app.replace("<label className={mode==='subscription'?'selected':''}>","{hasSellingPlan(kind,pack)&&<label className={mode==='subscription'?'selected':''}>");
app=app.replace("each delivery</p></label>","each delivery</p></label>}");
app=app.replace('<Button onClick={()=>add()}>ADD TO CART</Button>','<Button disabled={cartBusy} onClick={()=>add()}>{cartBusy?\'UPDATING CART…\':\'ADD TO CART\'}</Button>');
app=app.replace("[discount,setDiscount]=useState(()=>localStorage.getItem('jiyu-discount')==='true')","[discount,setDiscount]=useState(false)");
app=app.replace("!offerHidden&&<div", "false&& !offerHidden&&<div");
app=app.replace("function submit(e){","function submit(e){if(e.target.closest('footer')){e.preventDefault();setNotice('Email signup is not enabled for this store yet.');return}");
app=app.replace("if(page==='checkout')return", "if(page==='checkout')return");
fs.writeFileSync(path.join(stage,'src/App.jsx'),app);
let cart=fs.readFileSync(path.join(stage,'src/CartContents.jsx'),'utf8');
cart="import {hasSellingPlan} from '../shopify-src/commerce.jsx';\n"+cart;
cart=cart.replace("x.mode==='onetime'&&<button", "x.mode==='onetime'&&hasSellingPlan(x.key,x.pack)&&<button");
fs.writeFileSync(path.join(stage,'src/CartContents.jsx'),cart);
await build({configFile:false,define:{'process.env.NODE_ENV':'"production"'},root:stage,publicDir:path.join(root,'public'),build:{outDir:path.join(stage,'compiled'),emptyOutDir:true,copyPublicDir:false,lib:{entry:path.join(stage,'src/main.jsx'),name:'JIYUStorefront',formats:['iife'],fileName:()=> 'jiyu.js'},rollupOptions:{output:{inlineDynamicImports:true}},cssCodeSplit:false,minify:true}});
for(const d of ['assets','layout','templates','sections','snippets','config','locales'])fs.mkdirSync(path.join(output,d),{recursive:true});
const extensionless=[];
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(path.join(dir,x.name)):[path.join(dir,x.name)])}
function assetName(relative){let n=relative.replaceAll('/','-');if(!path.extname(n)){extensionless.push(n);n+='.jpg'}return n}
const cssFix=css=>css.replaceAll('/assets/source/','source-').replaceAll('/assets/videos/','videos-').replaceAll('/assets/','').replace(/(["'(])\/(reference|nav-about|nav-loyalty|nav-faq)\.css/g,'$1$2.css');
for(const file of walk(path.join(root,'public/assets'))){const relative=path.relative(path.join(root,'public/assets'),file);if(relative.startsWith('video/'))continue;const name=assetName(relative);if(name.endsWith('.css'))fs.writeFileSync(path.join(output,'assets',name),cssFix(fs.readFileSync(file,'utf8')));else fs.copyFileSync(file,path.join(output,'assets',name))}
for(const file of fs.readdirSync(path.join(root,'public')).filter(x=>x.endsWith('.css')))fs.writeFileSync(path.join(output,'assets',file),cssFix(fs.readFileSync(path.join(root,'public',file),'utf8')));
let code=fs.readFileSync(path.join(stage,'compiled/jiyu.js'),'utf8');
const ast=parseAst(code),edits=[];
function visit(n){if(!n||typeof n!=='object')return;if(n.type==='TemplateLiteral'&&n.quasis.some(q=>q.value.raw.includes('/assets/'))){edits.push([n.start,n.end,'window.JIYU_THEME.resolveAssetText('+code.slice(n.start,n.end)+')']);return}if(n.type==='Literal'&&typeof n.value==='string'&&n.value.includes('/assets/'))edits.push([n.start,n.end,'window.JIYU_THEME.resolveAssetText('+JSON.stringify(n.value)+')']);for(const [k,v]of Object.entries(n)){if(k==='parent')continue;if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object')visit(v)}}
visit(ast);for(const [s,e,v]of edits.sort((a,b)=>b[0]-a[0]))code=code.slice(0,s)+v+code.slice(e);
parseAst(code);fs.writeFileSync(path.join(output,'assets/jiyu.js'),code);
let styles=fs.readdirSync(path.join(stage,'compiled')).filter(x=>x.endsWith('.css')).map(x=>fs.readFileSync(path.join(stage,'compiled',x),'utf8')).join('\n');
styles=cssFix(styles)+`\n.j-shopify-cart-busy{opacity:.6;pointer-events:none}.j-cart-shipping,.j-cart-plan,.j-cart-footer .j-cart-totals>div:first-child:not(.j-cart-subtotal){display:none}.j-cart-checkout:disabled{opacity:.6}.j-offer-control{display:none}\n`;
fs.writeFileSync(path.join(output,'assets/jiyu.css'),styles);
const videoRoot='https://raw.githubusercontent.com/mohannadabuhdeib-art/shopify1/399b5e6fe6db8122131f712ada962a0cde3c8f6f/public/assets/video/';
fs.writeFileSync(path.join(output,'layout/theme.liquid'),`<!doctype html>
<html lang="{{ request.locale.iso_code }}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="canonical" href="{{ canonical_url }}"><title>{{ page_title | escape }} | {{ shop.name | escape }}</title>{{ content_for_header }}{{ 'jiyu.css' | asset_url | stylesheet_tag }}</head><body>
{% assign toner = settings.toner_product | default: all_products['renewal-rejuvenation-toner-pads'] %}{% assign cream = settings.cream_product | default: all_products['nad-anti-aging-moisturizing-cream'] %}{% assign bundle = settings.bundle_product | default: all_products['test-complete-care-bundle'] %}
<script>window.JIYU_THEME={assetBase:{{ 'jiyu.js' | asset_url | split: '?' | first | remove: 'jiyu.js' | json }},root:{{ routes.root_url | json }},accountUrl:{{ routes.account_url | json }},products:{toner:{{ toner | json }},cream:{{ cream | json }},bundle:{{ bundle | json }}}};window.JIYU_THEME.resolveAssetText=function(text){${extensionless.map(n=>`text=text.replaceAll('/assets/${n}','/assets/${n}.jpg');`).join('')}return text.replaceAll('/assets/video/',${JSON.stringify(videoRoot)}).replaceAll('/assets/source/',window.JIYU_THEME.assetBase+'source-').replaceAll('/assets/videos/',window.JIYU_THEME.assetBase+'videos-').replaceAll('/assets/',window.JIYU_THEME.assetBase)};</script>
{{ content_for_layout }}
<script src="{{ 'videos-hls.min.js' | asset_url }}" defer></script><script src="{{ 'jiyu.js' | asset_url }}" defer></script></body></html>`);
fs.writeFileSync(path.join(output,'sections/jiyu-storefront.liquid'),`<div id="root"></div><noscript><main><h1>{{ shop.name | escape }}</h1><p>Please enable JavaScript to browse this storefront.</p><a href="{{ routes.all_products_collection_url }}">Browse products</a></main></noscript>\n{% schema %}{"name":"JIYU Storefront","settings":[],"presets":[{"name":"JIYU Storefront"}]}{% endschema %}`);
for(const name of ['index','product','collection','list-collections','page','404','search','blog','article'])fs.writeFileSync(path.join(output,'templates',name+'.json'),JSON.stringify({sections:{main:{type:'jiyu-storefront',settings:{}}},order:['main']},null,2));
fs.writeFileSync(path.join(output,'templates/cart.liquid'),`{% layout none %}<!doctype html><html><head><meta charset="utf-8"><title>Your cart</title></head><body><main><h1>Your cart</h1><form action="{{ routes.cart_url }}" method="post">{% for item in cart.items %}<p>{{ item.product.title | escape }} — {{ item.variant.title | escape }} — {{ item.final_line_price | money }} <input aria-label="Quantity for {{ item.product.title | escape }}" name="updates[]" type="number" min="0" value="{{ item.quantity }}"></p>{% endfor %}<p>{{ cart.total_price | money }}</p><button name="update">Update cart</button><button name="checkout">Checkout</button></form><a href="{{ routes.root_url }}">Continue shopping</a></main></body></html>`);
fs.writeFileSync(path.join(output,'templates/password.liquid'),`{% layout none %}<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{{ shop.name | escape }}</title>{{ content_for_header }}</head><body style="background:#fdfaf0;color:#006e37;font-family:sans-serif;text-align:center;padding:12vh 24px"><h1>{{ shop.name | escape }}</h1><p>{{ shop.password_message }}</p>{% form 'storefront_password' %}{{ form.errors | default_errors }}<label for="password">Store password</label><input id="password" type="password" name="password"><button>Enter store</button>{% endform %}</body></html>`);
fs.writeFileSync(path.join(output,'config/settings_schema.json'),JSON.stringify([{name:'theme_info',theme_name:'JIYU Green & Pink',theme_version:'1.0.0',theme_author:'mohannadabuhdeib-art',theme_documentation_url:'https://github.com/mohannadabuhdeib-art/shopify1',theme_support_url:'https://github.com/mohannadabuhdeib-art/shopify1/issues'},{name:'Catalogue',settings:[{type:'paragraph',content:'Choose the Shopify products for the green toner, pink cream and their bundle. Each product should have 1, 2 and 3 Jar pack variants. Configure store shipping, payments and policies before launch.'},...['toner','cream','bundle'].map(key=>({type:'product',id:key+'_product',label:key==='toner'?'Green toner pads':key==='cream'?'Pink moisturizing cream':'Green and pink bundle'}))]}],null,2));
fs.writeFileSync(path.join(output,'config/settings_data.json'),JSON.stringify({current:{toner_product:'renewal-rejuvenation-toner-pads',cream_product:'nad-anti-aging-moisturizing-cream',bundle_product:'test-complete-care-bundle'},presets:{}},null,2));
fs.writeFileSync(path.join(output,'locales/en.default.json'),JSON.stringify({general:{accessibility:{skip_to_content:'Skip to content'}}}));
fs.writeFileSync(path.join(output,'README.md'),'# JIYU Shopify theme\n\nGenerated from the main branch with scripts/build-shopify.mjs. Connect this branch to Shopify as an unpublished theme.\n\nStore-specific setup remains: create/select the three Shopify products with pack variants, create pages, configure shipping and payment testing, and activate only configured subscriptions/rewards. Cart operations use Shopify Ajax and checkout uses Shopify. Product imagery and fonts are theme assets. Video playlists temporarily use the pinned public source repository and should move to Shopify Files for production. Source review/marketing content remains assignment reference material.\n');
console.log('Shopify theme ready:',output,'; runtime media expressions:',edits.length);
