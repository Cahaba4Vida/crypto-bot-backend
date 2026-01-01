function sleep(ms:number){return new Promise(r=>setTimeout(r,ms));}
async function main(){
  console.log("Worker started");
  while(true){
    console.log("tick", new Date().toISOString());
    await sleep(5*60*1000);
  }
}
main();
