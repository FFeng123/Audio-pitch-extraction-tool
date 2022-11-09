var audioContext = null;
var config = {}

var noteStrings =       ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function noteFromPitch( frequency ) {
	var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) );
	return Math.round( noteNum ) + 69;
}

function frequencyFromNoteNumber( note ) {
	return 440 * Math.pow(2,(note-69)/12);
}

function centsOffFromPitch( frequency, note ) {
	return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
}


/// 计算声音频率
function autoCorrelate( buf, sampleRate ) {
	// Implements the ACF2+ algorithm
	var SIZE = buf.length;
	var rms = 0;

	for (var i=0;i<SIZE;i++) {
		var val = buf[i];
		rms += val*val;
	}
	rms = Math.sqrt(rms/SIZE);
	if (rms < config.minv) // not enough signal
		return -1;

	var r1=0, r2=SIZE-1, thres=0.2;
	for (var i=0; i<SIZE/2; i++)
		if (Math.abs(buf[i])<thres) { r1=i; break; }
	for (var i=1; i<SIZE/2; i++)
		if (Math.abs(buf[SIZE-i])<thres) { r2=SIZE-i; break; }

	buf = buf.slice(r1,r2);
	SIZE = buf.length;

	var c = new Array(SIZE).fill(0);
	for (var i=0; i<SIZE; i++)
		for (var j=0; j<SIZE-i; j++)
			c[i] = c[i] + buf[j]*buf[j+i];

	var d=0; while (c[d]>c[d+1]) d++;
	var maxval=-1, maxpos=-1;
	for (var i=d; i<SIZE; i++) {
		if (c[i] > maxval) {
			maxval = c[i];
			maxpos = i;
		}
	}
	var T0 = maxpos;

	var x1=c[T0-1], x2=c[T0], x3=c[T0+1];
	a = (x1 + x3 - 2*x2)/2;
	b = (x3 - x1)/2;
	if (a) T0 = T0 - b/(2*a);

	return sampleRate/T0;
}

// 获取音符
function updatePitch(ac) {
    var note =  noteFromPitch(ac);
    var note1 = Math.trunc(note / 12);
    var note2 = note - 12 * note1;
    var detune = centsOffFromPitch(ac, note);
    return {
        "n": noteStrings[note2] + note1,
        "f": Math.round(ac),
        "d": detune,
        "l": 1,
    }
}

// 进行一个音频文件的转换
function runAudioFile(file,updFunc){
    return new Promise((resolve, reject) => {
        updFunc(0);
        
        file.arrayBuffer().then(re =>audioContext.decodeAudioData(re).then(ddata => {
            let data = [];

            async function run(){
                
                // 计算各种参数
                var pleng = Math.trunc(config.buflen * audioContext.sampleRate);
                var ffleng = config.ffl;
                var frames = Math.trunc(ddata.length / pleng);

                async function frameRun(f){
                    let ac = crateAudioContext();

                    let cutbuff = ac.createBuffer(1,pleng,ac.sampleRate);
                    cutbuff.getChannelData(0).set(ddata.getChannelData(0).subarray(f * pleng,f * pleng + pleng));

                    let audiobuff = ac.createBufferSource();
                    audiobuff.buffer = cutbuff;
                    audiobuff.loop = false;
                    let analyser = ac.createAnalyser();
                    analyser.fftSize = ffleng;
                    audiobuff.connect(analyser);
                    audiobuff.start(0);

                    await ac.startRendering();

                    let buf = new Float32Array(analyser.frequencyBinCount);
                    analyser.getFloatTimeDomainData(buf);
                    return autoCorrelate(buf,ac.sampleRate);
                }
                for (let i = 0; i < frames; i++) {
                    let rv = await frameRun(i);
                    let gdt = rv == -1 ? {
                        "n":null,
                        "l":1,
                    } : updatePitch(rv);
                    if(data.length && data[data.length - 1].n == gdt.n){
                        data[data.length - 1].l += 1;
                    }else{
                        data.push(gdt);
                    }
                    updFunc((i + 1)/frames);
                }
            }
            run().then(re => {
                resolve(data);
            }).catch(re => reject(re));
        })).catch(re => reject(re));
    })
}
