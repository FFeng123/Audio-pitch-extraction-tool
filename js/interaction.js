
var Infiles = [];
var OutFiles = [];

var bar1Emt = document.getElementById("AllProg");
var bar2Emt = document.getElementById("OneProg");

var working = false;

function onSelectFile(){
    if(working) return;
    Infiles = Infiles.concat(Array.from(document.getElementById("inputFile").files));
    updataInfiles()
}

function updataInfiles(){
    var htmls = "";
    for (const i in Infiles) {
        htmls += `<div infid="${i}">${Infiles[i].name}</div>`;
    }

    let root = document.getElementById("Infilelist");
    root.innerHTML = htmls;
    for(const c in root.childNodes){
        root.childNodes[c].onclick = removeInFile;
    }
}


function cleanInFiles(){
    if(working) return;
    Infiles = []
    updataInfiles()
}

function removeInFile(a){
    if(working) return;
    if(typeof a != "number"){
        removeInFile(Number(a.target.getAttribute("infid")));
        return;
    }
    Infiles.splice(a,1);
    updataInfiles();
}

function updataConfig(){
    var cutnote = Number(document.getElementById("minnotel").value);
    var bpm = document.getElementById("bpm").value;
    config = {
        "ffl": Number(document.getElementById("ffll").value),
        "buflen": 60.0 / bpm * 4 / cutnote,
        "minv": document.getElementById("minV").value,
        "cutnote": String(cutnote),
        "bpm":bpm,
    }
    audioContext = crateAudioContext();
}

function crateAudioContext(){
    return new OfflineAudioContext(1,config.buflen * 44100,44100);
}

function onStartBtn(){
    if(working) return;
    updataConfig();
    runAll().then(re => {
        working = false;
    })
    working = true;
}

async function runAll(){
    for (const i in Infiles) {
        let redata;
        try{
            redata = await runAudioFile(Infiles[i],(b)=>{
                bar1Emt.value = i / Infiles.length + b / Infiles.length;
                bar2Emt.value = b
            });
        }catch(err){
            console.error(err);
            redata = null;
        }
        
        addOutFile({
            "name": Infiles[i].name,
            "data": redata,
        })
    }
    bar1Emt.value = 1;
}

function updataOutfiles(){
    var htmls = "";
    for (const i in OutFiles) {
        htmls += `<div outfid="${i}">${OutFiles[i].name} - ${OutFiles[i].data ? "成功" : "失败"}</div>`;
    }

    let root = document.getElementById("Outfilelist");
    root.innerHTML = htmls;
    for(const c in root.childNodes){
        root.childNodes[c].onclick = removeOutFile;
    }
}
function removeOutFile(a){
    if(typeof a != "number"){
        removeOutFile(Number(a.target.getAttribute("outfid")));
        return;
    }
    downloadAOutFile(OutFiles[a]);
    OutFiles.splice(a,1);
    updataOutfiles();
}

function addOutFile(data){
    OutFiles.push(data);
    updataOutfiles();
}

function downloadOutFiles(){
    for (const i in OutFiles) {
        downloadAOutFile(OutFiles[i]);
    }
    cleanOutFiles();
}
function downloadAOutFile(data){
    if(!data.data) return;
    switch (Number(document.getElementById("outputtype").value)) {
        case 0:
            downloadMIDI(data);
            break;
    }
}

function cleanOutFiles(){
    OutFiles = [];
    updataOutfiles();
}


function downloadFileData(data, fileName) {
    blob = new Blob([data],{"type": 'application/octet-stream'});
    let blobUrl = window.URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.download = fileName;
    link.style.display = 'none';
    link.href = blobUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}  

function downloadMIDI(data){
    function getTime(l){
        if(l == 1){
            return config.cutnote;
        }
        let tarr = [];
        for (let i = 0; i < l; i++) {
            tarr.push(config.cutnote);
        }
        return tarr;
    }

    var midi = new MidiWriter.Track();
    midi.setTempo(config.bpm);
    midi.addEvent(new MidiWriter.ProgramChangeEvent({instrument: 1}));
    var notedataarr = data.data;
    var wait = 0;
    for (const i in notedataarr) {
        var notedata = notedataarr[i];
        if(notedata.n){
            console.log(wait);
            midi.addEvent(new MidiWriter.NoteEvent({"pitch":   notedata.n, "duration": getTime(notedata.l),"wait": wait ? getTime(wait) : 0}));
            wait = 0;
        }else{
            wait = notedata.l;
        }
        
    }
    const writer = new MidiWriter.Writer(midi);
    downloadFileData(writer.buildFile(),data.name + ".mid");
}