(function () {
"use strict";
const D=window.NUMEN_DATA;
if(!D) return;
const $=id=>document.getElementById(id);
const letters="ABCDEFG";
const meanMedian=a=>{const s=[...a].sort((x,y)=>x-y);return s.length ? (s[Math.floor((s.length-1)/2)]+s[Math.floor(s.length/2)])/2 : null;};
const fixed=(v,n=2)=>v===null?"not detected":v.toFixed(n);
const signed=v=>v===null?"ND":(v>=0?"+":"")+v.toFixed(2);
const params=()=>({threshold:+$("threshold").value,shift:+$("shift").value,spread:+$("spread").value,margin:+$("margin").value});
let rows=[], cqs={};
function crossing(signal,t){
 for(let i=1;i<signal.length;i++) if(signal[i-1]<t&&signal[i]>=t) return D.cycles[i-1]+(t-signal[i-1])/(signal[i]-signal[i-1]);
 return null;
}
function calculate(p){
 cqs=Object.fromEntries(D.wells.map(w=>[w.id,crossing(w.signal,p.threshold)]));
 return D.inhibitors.flatMap((inhibitor,ai)=>{
  const ntcs=D.wells.filter(w=>w.group===letters[ai]+"_G");
  const ntcTimes=ntcs.map(w=>cqs[w.id]).filter(x=>x!==null);
  return D.levels.slice(0,6).map((level,bi)=>{
   const group=letters[ai]+"_"+letters[bi];
   const wells=D.wells.filter(w=>w.group===group);
   const vals=wells.map(w=>cqs[w.id]).filter(x=>x!==null);
   const ref=D.wells.filter(w=>w.group==="A_"+letters[bi]);
   const refTimes=ref.map(w=>cqs[w.id]).filter(x=>x!==null);
   const median=meanMedian(vals), refMedian=meanMedian(refTimes);
   const shift=vals.length&&refTimes.length===3?median-refMedian:null;
   const spread=vals.length?Math.max(...vals)-Math.min(...vals):null;
   const margin=ntcTimes.length&&vals.length?Math.min(...ntcTimes)-Math.max(...vals):null;
   const lowerBound=!ntcTimes.length&&vals.length?45-Math.max(...vals):null;
   const reasons=[];
   if(vals.length!==3) reasons.push("incomplete crossing");
   if(shift===null) reasons.push("reference incomplete");
   else if(Math.abs(shift)>p.shift) reasons.push("reference shift");
   if(spread!==null&&spread>p.spread) reasons.push("replicate spread");
   if(margin!==null&&margin<p.margin) reasons.push("NTC proximity");
   return {group,inhibitor,level,wells,ref,ntcs,ntcTimes,vals,median,shift,spread,margin,lowerBound,reasons};
  });
 });
}
function nextCheck(r){
 const list=[];
 if(r.reasons.includes("incomplete crossing")) list.push("Inspect the non-crossing trace and reaction record; confirm setup before repeating.");
 if(r.reasons.includes("reference incomplete")) list.push("Re-establish the matched reference before interpreting a shift.");
 if(r.reasons.includes("reference shift")) list.push("Review inhibition and input recovery against a matched process control.");
 if(r.reasons.includes("replicate spread")) list.push("Check dispensing, mixing and the individual replicate record.");
 if(r.reasons.includes("NTC proximity")) list.push("Inspect product specificity or melt curves; review NTCs before interpreting low-input signal.");
 return list.length?list.join(" "):"No rule triggered. Retain all controls and complete the team's remaining assay checks.";
}
const ns="http://www.w3.org/2000/svg";
function node(tag,attrs={},text){
 const el=document.createElementNS(ns,tag);
 Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
 if(text!==undefined) el.textContent=text;
 return el;
}
function draw(r,p){
 const svg=$("hero-viz");svg.replaceChildren();
 const x=c=>52+(c-1)/44*528,y=v=>282-(v+.4)/7*250;
 [-0,2,4,6].forEach(v=>{
  svg.append(node("line",{x1:52,x2:580,y1:y(v),y2:y(v),stroke:"#e0e0e0"}));
  svg.append(node("text",{x:44,y:y(v)+4,"text-anchor":"end"},String(v)));
 });
 [1,10,20,30,40,45].forEach(c=>svg.append(node("text",{x:x(c),y:306,"text-anchor":"middle"},String(c))));
 svg.append(node("text",{x:310,y:332,"text-anchor":"middle"},"Cycle"));
 svg.append(node("text",{x:52,y:17},"Baseline-corrected fluorescence (a.u.)"));
 svg.append(node("line",{x1:52,x2:580,y1:y(p.threshold),y2:y(p.threshold),stroke:"#444","stroke-dasharray":"2 4"}));
 svg.append(node("text",{x:577,y:y(p.threshold)-7,"text-anchor":"end"},"threshold "+p.threshold.toFixed(2)));
 const curves=[...r.ref.map(w=>[w,"#999",1.4,""]),...r.ntcs.map(w=>[w,"#9a651f",1.5,"5 4"]),...r.wells.map(w=>[w,"#1f7a8c",2.2,""])];
 curves.forEach(([w,color,width,dash])=>{
  const path=node("polyline",{points:w.signal.map((v,i)=>x(D.cycles[i])+","+y(v)).join(" "),fill:"none",stroke:color,"stroke-width":width,"stroke-dasharray":dash});
  path.append(node("title",{},w.id+" · crossing "+fixed(cqs[w.id])));
  svg.append(path);
 });
 r.wells.forEach(w=>{
  if(cqs[w.id]!==null){const circle=node("circle",{cx:x(cqs[w.id]),cy:y(p.threshold),r:4,fill:"#1f7a8c",stroke:"#fff","stroke-width":1});circle.append(node("title",{},w.id+": "+fixed(cqs[w.id])+" cycles"));svg.append(circle);}
 });
 svg.setAttribute("aria-label",r.inhibitor+"% competimer, series level "+r.level+". "+r.vals.length+" of 3 replicates cross; median shift "+signed(r.shift)+" cycles.");
}
function selected(){return rows.find(r=>r.inhibitor===+$("inhibitor").value&&r.level===+$("level").value);}
function select(r,scroll=false){
 $("inhibitor").value=r.inhibitor;$("level").value=r.level; render();
 if(scroll){$("inhibitor").focus({preventScroll:true});$("a1").scrollIntoView({behavior:"smooth"});}
}
function render(){
 const p=params();
 ["threshold","shift","spread","margin"].forEach(k=>$(k+"-label").textContent=p[k].toFixed(k==="threshold"||k==="spread"?2:1));
 rows=calculate(p);
 const r=selected();
 draw(r,p);
 $("metric-one").textContent=r.vals.length+"/3";
 $("metric-two").textContent=signed(r.shift);
 $("metric-three").textContent=r.spread===null?"—":r.spread.toFixed(2);
 const status=r.reasons.length?"Review this condition":"No flag under these rules";
 let detail=r.vals.length<3?"The median uses only "+r.vals.length+" detected replicate(s) and is provisional. ":"All three technical replicates cross the threshold. ";
 detail+=r.margin!==null?"The latest sample precedes the earliest matched NTC by "+r.margin.toFixed(2)+" cycles. ":r.lowerBound!==null?"No matched NTC crosses by cycle 45; separation is greater than "+r.lowerBound.toFixed(2)+" cycles, a censored lower bound. ":"No sample crossing time is available.";
 $("readout").replaceChildren();
 const strong=document.createElement("strong");strong.textContent=status+". ";$("readout").append(strong,document.createTextNode(detail+" "+nextCheck(r)));
 $("replicates").replaceChildren();
 r.wells.forEach(w=>{const el=document.createElement("span");el.textContent=w.id+": "+(cqs[w.id]===null?"not crossed by 45":fixed(cqs[w.id])+" cycles");$("replicates").append(el);});
 const n=rows.filter(x=>x.reasons.length).length;
 $("queue-heading").textContent=n+" of 42 conditions flagged for review";
 const ntcCount=D.wells.filter(w=>w.level===null&&cqs[w.id]!==null).length;
 $("cohort-summary").textContent="At the current threshold, "+ntcCount+"/21 NTC curves cross by cycle 45. An NTC crossing alone does not identify its cause; proximity to the sample is one review signal. All 147 measured curves remain in the analysis.";
 matrix(r);queue();
}
function matrix(r){
 const body=$("matrix-body");body.replaceChildren();
 D.inhibitors.forEach(inhibitor=>{
  const tr=document.createElement("tr"),th=document.createElement("th");th.scope="row";th.textContent=inhibitor+"%";tr.append(th);
  rows.filter(x=>x.inhibitor===inhibitor).forEach(x=>{
   const td=document.createElement("td"),b=document.createElement("button");
   b.type="button";b.textContent=(x.shift===null?"ND":x.shift.toFixed(1))+(x.reasons.length?"*":"");
   b.className=x.reasons.length?"flagged":"";
   b.setAttribute("aria-pressed",String(x.group===r.group));
   b.setAttribute("aria-label",inhibitor+"% competimer, level "+x.level+", shift "+signed(x.shift)+", "+(x.reasons.join(", ")||"no flag"));
   b.addEventListener("click",()=>select(x));td.append(b);tr.append(td);
  });body.append(tr);
 });
}
function queue(){
 const all=$("queue-filter").value==="all";
 const sorted=[...rows].sort((a,b)=>(b.vals.length<3)-(a.vals.length<3)||b.reasons.length-a.reasons.length||Math.abs(b.shift||0)-Math.abs(a.shift||0));
 const display=all?sorted:sorted.filter(r=>r.reasons.length).slice(0,8);
 $("queue-caption").textContent=all?"All 42 conditions, ordered by review priority":"First "+display.length+" flagged conditions: incomplete measurements first, then number of flags and absolute shift. Download includes all 42.";
 $("queue-body").replaceChildren();
 display.forEach(r=>{
  const tr=document.createElement("tr"),a=document.createElement("td"),b=document.createElement("td"),c=document.createElement("td"),button=document.createElement("button"),ids=document.createElement("small");
  button.type="button";button.textContent=r.inhibitor+"% · level "+r.level;button.addEventListener("click",()=>select(r,true));
  ids.textContent=r.wells.map(w=>w.id).join(", ");a.append(button,ids);
  b.textContent=r.vals.length+"/3 crossed; "+signed(r.shift)+" cycle shift. "+(r.reasons.join("; ")||"No flag");
  c.textContent=nextCheck(r);tr.append(a,b,c);$("queue-body").append(tr);
 });
 if(!display.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=3;td.textContent="No flags under the current criteria. This is not an assay-release decision.";tr.append(td);$("queue-body").append(tr);}
}
function exportCsv(){
 const p=params(),header=["source_commit","condition","inhibitor_percent","series_level","curve_ids","crossing_cycles","detected_n","median_crossing","median_shift","replicate_range","earliest_ntc","ntc_separation","ntc_separation_lower_bound","flags","next_check","fluorescence_threshold","max_shift","max_spread","min_ntc_margin"];
 const out=rows.map(r=>[D.commit,r.group,r.inhibitor,r.level,r.wells.map(w=>w.id).join(";"),r.wells.map(w=>cqs[w.id]===null?"not_crossed_by_45":cqs[w.id].toFixed(6)).join(";"),r.vals.length,r.median,r.shift,r.spread,r.ntcTimes.length?Math.min(...r.ntcTimes):null,r.margin,r.lowerBound,r.reasons.join(";"),nextCheck(r),p.threshold,p.shift,p.spread,p.margin]);
 const csv=[header,...out].map(row=>row.map(x=>'"'+String(x??"").replaceAll('"','""')+'"').join(",")).join("\r\n");
 const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),a=document.createElement("a");
 a.href=url;a.download="numen-reference-assay-review.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
["inhibitor","level"].forEach(id=>$(id).addEventListener("change",render));
["threshold","shift","spread","margin"].forEach(id=>$(id).addEventListener("input",render));
$("queue-filter").addEventListener("change",queue);
$("export").addEventListener("click",exportCsv);
$("reset").addEventListener("click",()=>{Object.entries({threshold:1,shift:2,spread:.5,margin:5}).forEach(([k,v])=>$(k).value=v);render();});
render();
}());
