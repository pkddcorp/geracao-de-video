// Trilha sonora sintetizada (piano suave + pad + reverb). Sem direitos autorais.
// trilha elegante: pad quente + arpejo tipo piano/celesta + pulso grave suave + reverb
const fs=require('fs');
module.exports=function gerarTrilha(T,CORTES,SINO,ARQ){const SR=44100,N=Math.ceil(SR*T);const L=new Float32Array(N),R=new Float32Array(N);
let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647*2-1;
const add=(i,l,r)=>{if(i>=0&&i<N){L[i]+=l;R[i]+=r;}};
const hz=m=>440*Math.pow(2,(m-69)/12);
// progressao (4 compassos de ~3.75s): Dmaj9 - Bm9 - Gmaj9 - Aadd9
const BAR=3.5;const NB=Math.ceil(T/BAR);const chords=[[53,60,65,69,72,77],[50,57,62,65,69,74],[46,53,58,62,65,70],[48,55,60,64,67,72]];
// pad
for(let c=0;c<NB;c++){const t0=c*BAR;chords[c%4].forEach((m,k)=>{const f=hz(m);if(k==0)return;
 for(let j=0;j<(BAR+1.2)*SR;j++){const t=j/SR;const env=Math.min(1,t/1.0)*Math.min(1,Math.max(0,(BAR+1.2-t)/1.2));
  const v=(Math.sin(2*Math.PI*f*t)+.3*Math.sin(2*Math.PI*f*2.003*t)+.12*Math.sin(2*Math.PI*f*3*t))*env*.022;
  const pan=(k/6);add(Math.floor((t0+t)*SR),v*(1-pan*.5),v*(.5+pan*.5));}});}
// baixo suave
for(let c=0;c<NB;c++){const f=hz(chords[c%4][0]-12);for(let b=0;b<4;b++){const t0=c*BAR+b*BAR/4+(c==0&&b==0?0:0);
 for(let j=0;j<SR*.9;j++){const t=j/SR;const v=Math.sin(2*Math.PI*f*t)*Math.exp(-t*3.2)*Math.min(1,t*200)*(b==0?.26:.14);add(Math.floor((t0+t)*SR),v,v);}}}
// arpejo (colcheias)
const step=BAR/16;const pat=[1,3,5,4,2,4,5,3];
const pluck=(t0,f,g,pan)=>{for(let j=0;j<SR*1.6;j++){const t=j/SR;const e=Math.exp(-t*3.5)*Math.min(1,t*400);
 const v=(Math.sin(2*Math.PI*f*t)+.35*Math.sin(2*Math.PI*f*2*t)*Math.exp(-t*6)+.1*Math.sin(2*Math.PI*f*4.01*t)*Math.exp(-t*10))*e*g;add(Math.floor((t0+t)*SR),v*(1-pan),v*pan);}};
for(let c=0;c<NB;c++)for(let s=0;s<16;s++){const t0=c*BAR+s*step;if(t0<0.3)continue;const m=chords[c%4][pat[s%8]]+12;
 const g=(t0>T-1.2?.5:1)*.05;pluck(t0,hz(m),g,.3+.4*((s%2)));}
// brilho nos cortes (swell reverso)
CORTES.forEach(c=>{const s=Math.floor((c-.8)*SR);for(let j=0;j<SR*.8;j++){const p=j/(SR*.8);const v=rnd()*p*p*p*.05;
 const tone=Math.sin(2*Math.PI*hz(86)*j/SR)*p*p*.03;add(s+j,v+tone,v+tone);}});
// sininho no CTA
[81,88,93].forEach((m,k)=>pluck(SINO+k*.09,hz(m),.05,.5));

// reverb simples (delays com feedback)
const rv=(buf,ds,fb)=>{const out=new Float32Array(N);ds.forEach(d=>{const D=Math.floor(d*SR);const y=new Float32Array(N);for(let i=0;i<N;i++){y[i]=buf[i]+(i>=D?y[i-D]*fb:0);}for(let i=0;i<N;i++)out[i]+=y[i]*.22;});return out;};
const RL=rv(L,[.0297,.0371,.0411,.0437],.82),RR=rv(R,[.0311,.0359,.0423,.0449],.82);
for(let i=0;i<N;i++){L[i]=L[i]*.8+RL[i]*.18;R[i]=R[i]*.8+RR[i]*.18;}
// fade
for(let i=0;i<N;i++){const t=i/SR;const g=Math.min(1,t/.08)*Math.min(1,(T-t)/1.0);L[i]*=g;R[i]*=g;}
let m=0;for(let i=0;i<N;i++)m=Math.max(m,Math.abs(L[i]),Math.abs(R[i]));
const b=Buffer.alloc(44+N*4);b.write('RIFF',0);b.writeUInt32LE(36+N*4,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);
b.writeUInt32LE(SR,24);b.writeUInt32LE(SR*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(N*4,40);
for(let i=0;i<N;i++){b.writeInt16LE(Math.round(L[i]/m*29000),44+i*4);b.writeInt16LE(Math.round(R[i]/m*29000),46+i*4);}
fs.writeFileSync(ARQ,b);};
