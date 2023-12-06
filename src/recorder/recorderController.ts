export type CustomRecorderOptions = {
  previousSecondsToRecord?: number;
};

export class RecorderController {
  recorder: MediaRecorder;
  audioChunks: Blob[] = [];

  options: CustomRecorderOptions;
  isRecording: boolean = false;

  constructor(stream: MediaStream, options: CustomRecorderOptions) {
    const recordingStream = new MediaStream();
    for (const track of stream.getAudioTracks()) {
      recordingStream.addTrack(track);
    }

    this.recorder = new MediaRecorder(recordingStream, {});
    this.recorder.addEventListener('dataavailable', this.ondataavailable);

    this.options = options;
  }

  ondataavailable = async (event: BlobEvent) => {
    console.log('Recording length: ' + this.audioChunks.length);
    this.audioChunks.push(event.data);
  };

  start = () => {
    if (this.isRecording) return;
    this.isRecording = true;

    this.recorder.start(500);
    console.log('Recording has been started!');
  };

  stop = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      this.recorder.onstop = () => {
        this.isRecording = false;

        const audioBlob = new Blob(this.audioChunks, {
          type: 'audio/ogg; codecs=opus',
        });

        this.audioChunks = [];

        console.log('Recording has been stopped!');
        resolve(audioBlob);
      };

      this.recorder.stop();
    });
  };

  dispose = () => {
    if (this.recorder.state === 'recording') this.recorder.stop();

    this.audioChunks = [];
    this.recorder.removeEventListener('dataavailable', this.ondataavailable);
    this.recorder = undefined!;
  };
}
