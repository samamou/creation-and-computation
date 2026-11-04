
// ===================================================================================================
// Project title: HUMAN x NATURE (final code iteration)
// Authors: Ally Choi, Lam Nguyen, Sarah Al Mamoun, Xiaofeng Li (Kara)
// Course: Creation & Computation - Experiment 2, Nov 4th 2026
//
// Description: participants lie on their backs with their phone screen-down on their belly.
// Each phone gives a random prompt to record an imagined nature sound. 
// When the phone faces the sky, the torch twinkles and the recording loops, with random pauses.
//
// Attribution: p5.js, the p5-phone library and its Basic Orientation example, and MDN’s MediaRecorder
// ===================================================================================================

// "Facing the sky" thresholds (degrees)
let skyMinX = 150;   // rotationX above this = screen down
let skyMaxY = 10;    // rotationY below this = not tipped sideways

// Twinkle timing (milliseconds)
let twinkleCycle = 200;  // length of one twinkle cycle
let twinkleDip = 700;    // how long the light is off in each cycle

let cycleStart = 0;          // when the current twinkle cycle began

let isFacingSky = false;
let prevFacingSky = false; // sky state from the previous frame
let wantLight = false;       // what the light should be doing right now
let lightRequested = false;  // what we last asked the torch to do

let questions = [
  { text: 'Record what you think rain sounds like.', weight: 3, maxGap: 4000 },
  { text: 'Record what you think the wind sounds like.', weight: 4, maxGap: 3000 },
  { text: 'Record what you think a flowing stream sounds like.', weight: 3, maxGap: 200 },
  { text: 'Record what you think trees sound like in the wind.', weight: 4, maxGap: 4000 },
  { text: 'Record what you think a campfire crackling sounds like.', weight: 2, maxGap: 15000 },
  { text: 'Record what you think a raindrop on a tent sounds like.', weight: 2, maxGap: 18000 },
  { text: 'Record what you think your heartbeat sounds like at night.', weight: 2, maxGap: 100 },
  { text: 'Record what you think a frog sounds like.', weight: 2, maxGap: 30000 },
  { text: 'Record what you think an owl sounds like.', weight: 1, maxGap: 60000 },
  { text: 'Record what you think cicadas sound like.', weight: 3, maxGap: 6000 },
  { text: 'Record what you think crickets sound like.', weight: 3, maxGap: 5000 },
  { text: 'Record what you think a wolf howling sounds like.', weight: 1, maxGap: 100000 }
];

let question = '';

let holdBtn;     //the button
let isPlay = false;
let micStream;        // mic in stream
let recorder;         // MediaRecorder
let chunks = [];      // chunks of recorded audio from MediaRecorder
let recording = false; // check is recording R Now

// iOS requires a user gesture before audio can play, so we use Web Audio (AudioContext)
let audioCtx;
let recordedBuffer = null;
let currentSource = null;
let gainNode; // sound volume

let fadeTimer = null;
let soudRate = 1.1;      //play speed
let maxGap = 0;      // max random pause between replays (ms), set per question
const fadeTime = 500;  // fade in and fade out timer，ms

let isLooping = false;

// basic setup and text on canvas adapted from examples by Sarah Al Mamoun 
function setup() {
    createCanvas(windowWidth, windowHeight);
    angleMode(DEGREES);

    let selectedQuestion = randomisation();

    question = selectedQuestion.text;
    maxGap = selectedQuestion.maxGap;

    debug(maxGap);
  
    lockGestures();
  
    showDesktopQr({ rememberDismiss: false }); // without this i lose the QR code
    enablePermissionsButton(['gyro', 'torch','mic'],'Tap to start');
    textAlign(CENTER, CENTER);
}

// Main loop. Written by: everyone (each step is its own function below)
function draw() {
    background(0);

    if (window.sensorsEnabled && window.torchEnabled) {
        // Is the phone screen down and flat?
        // Written by: Sarah Al Mamoun, adapted from p5-phone Basic Orientation example
        isFacingSky = abs(rotationX) > skyMinX && abs(rotationY) < skyMaxY;

        updateTwinkle(); // decide if the torch should be on this frame
        createRecordButton(); // build the record button (only runs once)
        drawRecordingStatus(); // show "Recording..." / "Ready" and the question
        updateTorch(); // send on or off to the torch only if it changed
        drawStatus();  // start/stop audio when the phone flips, show instructions
    }
    else if (window.torchError) {
        // tell the user what to do 
        fill(255, 120, 120);
        textSize(18);
        text('Light blocked: ' + window.torchError +
             '\nReload and accept permissions', width/2, height/2);
    }
}

// Written by: Sarah Al Mamoun
// Twinkle: while facing the sky, the torch stays on with a short random
// "dip" (off) every 4–8 seconds, like a star. Sets wantLight for updateTorch().
function updateTwinkle() {
    // How long since the current twinkle cycle started
    let timeInCycle = millis() - cycleStart;

    // start a new twinkle cycle with random length and dip
    if (timeInCycle > twinkleCycle) {
        cycleStart = millis();
        twinkleCycle = random(4000, 8000);
        twinkleDip = random(150, 250);
    }

    // off or on
    if (isFacingSky == false) {
        wantLight = false;
    } else if (timeInCycle < twinkleDip) {
        wantLight = false;
    } else {
        wantLight = true;
    }
}

// Written by: Xiaofeng (Kara), Lam Nguyen and Ally Choi
// Creates the round record button once, after permissions are granted
function createRecordButton() {
    if (holdBtn) return; // button already exists

    holdBtn = createButton('Press to record');
    holdBtn.style('width', '200px');
    holdBtn.style('height', '200px');
    holdBtn.style('border-radius', '50%');
    holdBtn.style('border', 'none');
    holdBtn.style('font-size', '20px');
    holdBtn.style('color', '#fff');
    holdBtn.style('background', '#dc2626');
    holdBtn.style('touch-action', 'none');
    holdBtn.style('user-select', 'none');
    holdBtn.style('position', 'absolute');
    holdBtn.style('z-index', '10'); // above canvas

    // place button above center
    holdBtn.position(windowWidth/2 - 100, windowHeight/2 - 300);
    // event listener: tapping the button starts/stops recording
    holdBtn.elt.addEventListener('pointerdown', startRecord);
}

// Written by: Xiaofeng (Kara), Lam Nguyen and Ally Choi
// Shows the recording status and this phone's question
function drawRecordingStatus() {
    if (recording) {
        text('Recording...', width/2, height/2 - 80);
    } else if (recordedBuffer) {
        text('Ready', width/2, height/2 - 80);
    }
    text(question, width/2, height/2 + 120);
}

// Adapted from p5 phone example by Sarah Al Mamoun 
// send a command to the torch only when the wanted light changes
function updateTorch() {
    if (wantLight !== lightRequested) {
        lightRequested = wantLight;
        setTorch(wantLight);
    }
}

// Adapted from p5 phone examples by Sarah Al Mamoun 
// show debugging statements SKY / NO SKY, and instructions
function drawStatus() {
    fill(255);
    textSize(20);
    
    // text('X: ' + rotationX.toFixed(1) + '°   Y: ' + rotationY.toFixed(1) + '°', width/2, height/2 - 40); keeping this here and commented out for any 
    // textSize(32);

    if(isFacingSky !== prevFacingSky){
          if(isFacingSky){
            playRecordedAudio() //play the sound
          }else{
            stopPlayAudio() //stop the sound
          }
          prevFacingSky = isFacingSky;
        }
    textSize(16);
    fill(180);
    text('Lie on your back, phone screen down on your belly', width/2, height/2 + 70);
}

// Written by : Xiaofeng (Kara) and Lam Nguyen
// Privacy: audio stays in memory only for playback; never saved, stored, or sent anywhere
async function startRecord() {
//debug("button tapped");

  if (!recording) {
    //frist time press the button, init and unlock the AudioContext 
    //otherwise  it wont work in iphone
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      gainNode = audioCtx.createGain();
      gainNode.connect(audioCtx.destination);
      // make silent audio keep play 
      //it dont need to ask user to press make the play() calling
      const silentBuf = audioCtx.createBuffer(1,1,22050);
      const silentSrc = audioCtx.createBufferSource();
      silentSrc.buffer = silentBuf;
      silentSrc.connect(audioCtx.destination);
      silentSrc.start();   //play the min silent audio back of the web, so funtion can recall play() without user action
    }

    try {
      // make empty stream value for start up function call
      if (!micStream) {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new MediaRecorder(micStream);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
      }
      chunks = [];
      recorder.start();
      recording = true;
      holdBtn.html('Stop');
      holdBtn.style('background', '#857a7a');
    } catch (err) {
      debugError('❌ ' + err.name);        // display error debug
      console.error(err);
    }
  } else {
    recorder.stop();
    recording = false;
    holdBtn.html('Start');
    holdBtn.style('background', '#dc2626');

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      // WebAudio use the webaudio to play the sound
      //blob transfer to AudioBuffer it will has BUG when use the URL.ObjectURL 
      const arrayBuf = await blob.arrayBuffer();
      recordedBuffer = await audioCtx.decodeAudioData(arrayBuf);
      debug('record done，able to play');
    };
  }
}

// Written by : Xiaofeng (Kara) and Lam Nguyen 
//play the sound that user record
function playRecordedAudio() {
  if (isPlay){
    return
  }
  if (!recordedBuffer || !audioCtx) {
    debug('no record');
    return;
  }
  if(audioCtx.state === "suspended") audioCtx.resume();
  isPlay = true;
  debug('playing...');
  startFadeLoop()
}

// Written by : Xiaofeng (Kara) and Lam Nguyen 
function stopPlayAudio() {
  if(!isPlay){
    return;
  }
  isLooping = false;
  isPlay = false;
  clearInterval(fadeTimer);
  if(currentSource){
    try{currentSource.stop()}catch(e){}
    currentSource = null;
  }
  gainNode.gain.value = 0;
  debug('stop the sound...');
}

// Written by Xiaofeng (Kara)
// sound amp tools
function fadeSound(targetVol, dur, callback) {
  clearInterval(fadeTimer);
  const startVol = gainNode.gain.value;
  const stepTime = 30;
  const step = (targetVol - startVol) / (dur / stepTime);

  fadeTimer = setInterval(() => {
    gainNode.gain.value = Math.max(0, Math.min(1,gainNode.gain.value + step));
    let done = false;
    if (step > 0 && gainNode.gain.value >= targetVol) {
      gainNode.gain.value = Math.max(0, Math.min(1, targetVol));
      done = true;
    }
    if (step < 0 && gainNode.gain.value <= targetVol) {
      gainNode.gain.value = Math.max(0, Math.min(1, targetVol));
      done = true;
    }
    if (done) {
      clearInterval(fadeTimer);
      if (callback) callback();
    }
  }, stepTime);
}

// Written by Xiaofeng (Kara)
function startFadeLoop() {
  isLooping = true;
  gainNode.gain.value = 0;       //set the fade in start up value
  fadeSound(1, fadeTime, () => {
    playOnce();                  //call the sound play funtion
  });
}

// Written by Xiaofeng (Kara)
// one run for play the recording sound
function playOnce(){
  if(!isLooping || !recordedBuffer) return;
  if(currentSource){
    try{currentSource.stop()}catch(e){}
  }
  currentSource = audioCtx.createBufferSource();
  currentSource.buffer = recordedBuffer;
  currentSource.playbackRate = soudRate;
  currentSource.connect(gainNode);
  currentSource.onended = () => {
    if (!isLooping) return;
    // Choose a new random delay after every playback
    let gapTime = random(maxGap);

    setTimeout(() => {
      if (!isLooping) return;
      playOnce();
    }, gapTime);
  };
  currentSource.start();      //play the sound
}

// Written by: Ally Choi
// Picks a question at random, weighted so common sounds appear more often.
function randomisation() {
  let totalWeight = 0;
  for (let q of questions) {
    totalWeight += q.weight;
  }
  let rand = random(totalWeight); //random number within total

  for (let q of questions) {
    rand -= q.weight;
    if (rand < 0) {
      return q;
    }
  }
}

// adapted from p5 phone examples
function mousePressed() {
    return false;
}

// adapted from p5 phone examples
function mouseReleased() {
    if (fullscreen() == false) {
        fullscreen(true);
    }
    return false;
}