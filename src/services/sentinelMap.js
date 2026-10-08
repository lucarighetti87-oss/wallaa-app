const number=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
const tile=(lat,lng)=>{const n=2**16,r=Math.max(-85.0511,Math.min(85.0511,lat))*Math.PI/180;return {x:(lng+180)/360*n,y:(1-Math.asinh(Math.tan(r))/Math.PI)/2*n};};
export function sentinelDirection(bearing){const value=number(bearing);return value===null?'Direzione non disponibile':['Nord','Nord-est','Est','Sud-est','Sud','Sud-ovest','Ovest','Nord-ovest'][Math.round(((value%360+360)%360)/45)%8];}
export function sentinelMapOffset(sentinel,lat,lng,width,height,padding=30){
 const edgeX=Math.max(0,width/2-padding),edgeY=Math.max(0,height/2-padding);
 if(edgeX===0||edgeY===0)return null;
 const latitude=number(sentinel.latitude),longitude=number(sentinel.longitude),bearing=number(sentinel.bearingDeg);
 const coordinates=latitude!==null&&longitude!==null&&Math.abs(latitude)<=90&&Math.abs(longitude)<=180;
 let dx,dy,forced=sentinel.edgeOnly===true||!coordinates;
 if(forced){if(bearing===null)return null;const rad=bearing*Math.PI/180;dx=Math.sin(rad);dy=-Math.cos(rad);}
 else {const a=tile(lat,lng),b=tile(latitude,longitude);dx=(b.x-a.x)*256;const world=2**16*256;if(dx>world/2)dx-=world;if(dx< -world/2)dx+=world;dy=(b.y-a.y)*256;}
 const outside=forced||Math.abs(dx)>edgeX||Math.abs(dy)>edgeY;
 if(outside){const scale=Math.min(Math.abs(dx)>1e-12?edgeX/Math.abs(dx):Infinity,Math.abs(dy)>1e-12?edgeY/Math.abs(dy):Infinity);if(!Number.isFinite(scale))return null;dx*=scale;dy*=scale;}
 return {dx,dy,outOfView:outside,bearingDeg:bearing??((Math.atan2(dx,-dy)*180/Math.PI+360)%360)};
}
export function clusterSentinelMarkers(markers){const clusters=[];for(const marker of markers){const group=clusters.find(cluster=>cluster.outOfView===marker.outOfView&&Math.hypot(cluster.dx-marker.dx,cluster.dy-marker.dy)<36&&(!marker.outOfView||Math.abs(((cluster.items[0].bearingDeg-marker.bearingDeg+540)%360)-180)<=12));if(group){group.items.push(marker);if(!marker.outOfView){const n=group.items.length;group.dx=(group.dx*(n-1)+marker.dx)/n;group.dy=(group.dy*(n-1)+marker.dy)/n;}}else clusters.push({...marker,items:[marker]});}return clusters;}
