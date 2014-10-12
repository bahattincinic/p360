/**
    Contains recording utilities
    analyser and recording reactive variable
    for relevant ui operations
*/
Recording = function() {
    var self = this;
    self.recording = false;
    self.recordingDep = new Tracker.Dependency;

    self.getRecording = function() {
        self.recordingDep.depend();
        return self.recording;
    };

    self.setRecording = function(r) {
        self.recording = r;
        self.recordingDep.changed();
    };
};


var rafID = null;               // frame updates for canvas
var analyserContext = null;     // for recording/canvas
// variables shared with chat.js
analyserNode = null;

updateAnalysers = function (time) {
    /**
        Used for updating canvas area
        kickstarted when user starts recording
        sound, browser updates area unless
        cancelled via "cancelAnalyserUpdates"
    */

    if (!analyserContext) {
        var canvas = document.getElementById("analyser");
        canvasWidth = canvas.width;
        canvasHeight = canvas.height;
        analyserContext = canvas.getContext('2d');
    }

    // analyzer draw code here
    {
        var SPACING = 3;
        var BAR_WIDTH = 1;
        var numBars = Math.round(canvasWidth / SPACING);
        var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

        analyserNode.getByteFrequencyData(freqByteData);

        analyserContext.clearRect(0, 0, canvasWidth, canvasHeight);
        analyserContext.fillStyle = '#F6D565';
        analyserContext.lineCap = 'round';
        var multiplier = analyserNode.frequencyBinCount / numBars;

        // Draw rectangle for each frequency bin.
        for (var i = 0; i < numBars; ++i) {
            var magnitude = 0;
            var offset = Math.floor( i * multiplier );
            // gotta sum/average the block, or we miss narrow-bandwidth spikes
            for (var j = 0; j< multiplier; j++)
                magnitude += freqByteData[offset + j];
            magnitude = magnitude / multiplier;
            var magnitude2 = freqByteData[i * multiplier];
            analyserContext.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
            analyserContext.fillRect(i * SPACING, canvasHeight, BAR_WIDTH, -magnitude);
        }
    }

    rafID = window.requestAnimationFrame( updateAnalysers );
};

cancelAnalyserUpdates = function () {
    /**
        Cancel update to canvas called when user
        stops recording sound
    */
    window.cancelAnimationFrame(rafID);
    rafID = null;
};