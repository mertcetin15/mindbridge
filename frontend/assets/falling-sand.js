/* Fixed logical grid: gravity, collision, diagonal slumping and bounded memory. */
(function(root){'use strict';
class FallingSand{
 constructor(w=240,h=135){this.w=w;this.h=h;this.cells=new Uint8Array(w*h);this.tick=0;this.active=false;}
 pour(x,y,color,spread=3,amount=5,mirror=false){let added=0;for(let n=0;n<amount;n++){const px=Math.max(0,Math.min(this.w-1,Math.floor(x*this.w)+(n% (2*spread+1))-spread)),py=Math.max(0,Math.min(this.h-1,Math.floor(y*this.h)));for(const xx of mirror?[px,this.w-1-px]:[px]){const i=py*this.w+xx;if(!this.cells[i]){this.cells[i]=color;added++;}}}if(added)this.active=true;return added;}
 step(){let moved=false;const w=this.w,h=this.h,a=this.cells;this.tick++;for(let y=h-2;y>=0;y--){for(let k=0;k<w;k++){const x=this.tick%2?k:w-1-k,i=y*w+x;if(!a[i])continue;let next=i+w;const d=((x+y+this.tick)%2)?1:-1;if(a[next]){if(x+d>=0&&x+d<w&&!a[next+d])next+=d;else if(x-d>=0&&x-d<w&&!a[next-d])next-=d;else continue;}a[next]=a[i];a[i]=0;moved=true;}}this.active=moved;return moved;}
 settle(){for(let i=0;i<this.h*3&&this.active;i++)this.step();}
 snapshot(){return this.cells.slice();}
 restore(cells){this.cells.set(cells);this.active=true;}
 clear(){this.cells.fill(0);this.active=false;}
 draw(c,W,H,colors){const dx=W/this.w,dy=H/this.h;for(let y=0;y<this.h;y++)for(let x=0;x<this.w;x++){const v=this.cells[y*this.w+x];if(v){c.fillStyle=colors[v-1];c.fillRect(x*dx,y*dy,dx+.2,dy+.2);}}}
}
root.MBFallingSand=FallingSand;if(typeof module!=='undefined')module.exports=FallingSand;
})(typeof window!=='undefined'?window:globalThis);
