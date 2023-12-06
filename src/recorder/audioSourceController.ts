import { event } from '@hubai/core';
import { RecorderController } from './recorderController';

export type RecordingStartedEvent = {
  deviceId: string;
  deviceKind: MediaDeviceKind;
};

export type RecordingStoppedEvent = {
  blob: Blob;
  deviceId: string;
};

export class AudioSourceController {
  deviceId?: string;
  deviceKind?: MediaDeviceKind;

  stream?: MediaStream;

  eventEmitter: event.EventEmitter;
  alwaysRecording: boolean = false;
  customRecorder?: RecorderController;

  constructor(alwaysRecording?: boolean) {
    this.alwaysRecording = alwaysRecording ?? false;
    this.eventEmitter = new event.EventEmitter();
  }

  get isRecording() {
    return this.customRecorder?.isRecording ?? false;
  }

  changeDevice(deviceId: string, deviceKind: MediaDeviceKind) {
    if (this.customRecorder && this.deviceId !== deviceId) {
      this.customRecorder.dispose();
      this.customRecorder = undefined;
    }
    this.deviceId = deviceId;
    this.deviceKind = deviceKind;
  }

  async startRecording() {
    if (this.isRecording) {
      return;
    }

    this.eventEmitter.emit('recordingStarted', {
      deviceId: this.deviceId ?? 'default',
      deviceKind: this.deviceKind,
    } as RecordingStartedEvent);

    if (!this.customRecorder) {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: {
            exact: this.deviceId,
          },
        },
      });

      this.customRecorder = new RecorderController(this.stream, {
        previousSecondsToRecord: 0,
      });
    }

    this.customRecorder.start();
  }

  async stopRecording(): Promise<Blob | undefined> {
    const blob = await this.customRecorder!.stop();
    this.eventEmitter.emit('recordingStopped', {
      blob: blob,
      deviceId: this.deviceId,
      deviceKind: this.deviceKind,
    } as RecordingStoppedEvent);

    return blob;
  }

  async toggleRecording(): Promise<Blob | undefined> {
    if (this.isRecording) {
      return this.stopRecording();
    } else {
      await this.startRecording();
    }
  }
}
