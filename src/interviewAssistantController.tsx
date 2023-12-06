import React from 'react';
import {
  AppContext,
  IShortcutSubscription,
  IToastService,
  IUserShortcut,
  IUserShortcutService,
  ChatAssistantContext,
  ChatInfo,
  IChatAssistantController,
  ExtensionContext,
} from '@hubai/core';
import { DeviceKind, InterviewWindow } from './workbench/interviewWindow';
import {
  AudioSourceController,
  RecordingStartedEvent,
  RecordingStoppedEvent,
} from './recorder/audioSourceController';
import { RECORDING_TOAST_ID } from './consts';

export type AudioSource = {
  controller: AudioSourceController;
  shortcutId?: string;
  deviceKind: MediaDeviceKind;
  id: string;
  deviceId?: string;
  shortcutSubscription?: IShortcutSubscription;
};

type State = {
  currentAudioDevice?: MediaDeviceInfo;
  currentMicrophoneDevice?: MediaDeviceInfo;
  computerAudioShortcut?: IUserShortcut;
  microphoneShortcut?: IUserShortcut;
  audioSources: AudioSource[];
};

export class InterviewAssistantController implements IChatAssistantController {
  chatContext!: ChatAssistantContext;

  private state: State;
  appContext: AppContext;
  extensionContext: ExtensionContext;
  toastService: IToastService;
  shortcutService: IUserShortcutService;

  constructor(appContext: AppContext, extensionContext: ExtensionContext) {
    this.state = {
      audioSources: [
        {
          id: 'microphone',
          deviceKind: 'audioinput',

          controller: new AudioSourceController(true),
        },
        {
          id: 'computerAudio',
          deviceKind: 'audiooutput',
          controller: new AudioSourceController(),
        },
      ],
    };

    this.appContext = appContext;
    this.extensionContext = extensionContext;
    this.toastService = this.appContext.services.toast;
    this.shortcutService = this.appContext.services.userShortcut;

    this.state.audioSources.forEach((source) => {
      source.controller.eventEmitter.subscribe(
        'recordingStarted',
        this.onRecordingStarted.bind(this)
      );

      source.controller.eventEmitter.subscribe(
        'recordingStopped',
        this.onRecordingStopped.bind(this)
      );
    });
  }

  async onRecordingStarted(event: RecordingStartedEvent) {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const device = devices.find((d) => d.deviceId === event.deviceId);

    this.toastService.info(
      `Recording ${device?.label}... \n\n Press the shortcut again to stop`,
      {
        toastId: RECORDING_TOAST_ID,
        position: 'top-center',
        autoClose: false,
      }
    );
  }

  onRecordingStopped({ blob }: RecordingStoppedEvent) {
    this.toastService.dismiss(RECORDING_TOAST_ID);

    if (blob && blob.size > 0) {
      console.log('sending audio message: ', blob);
      this.chatContext.session.sendMessage({ audio: blob });
    }
  }

  init(context: ChatAssistantContext): void {
    this.chatContext = context;

    this.initAsync();
  }

  async initAsync(): Promise<void> {
    this.updateBrainInstructions();

    const devices = await navigator.mediaDevices.enumerateDevices();
    const extensionSettings = this.extensionContext.settings.get();
    let { computerAudioShortcut, microphoneShortcut } =
      this.chatContext.getSettings() ?? {};

    if (!computerAudioShortcut) {
      computerAudioShortcut = extensionSettings.computerAudioShortcut;
    }
    if (!microphoneShortcut) {
      microphoneShortcut = extensionSettings.microphoneShortcut;
    }

    this.state.audioSources.forEach((source) => {
      const defaultDevice = devices.find((d) => d.kind === source.deviceKind);
      if (defaultDevice) {
        this.changeAudioSourceDevice(source, defaultDevice.deviceId);
      }

      if (source.deviceKind === 'audioinput') {
        source.shortcutId = microphoneShortcut;
        this.setState({ currentMicrophoneDevice: defaultDevice });
      }

      if (source.deviceKind === 'audiooutput') {
        source.shortcutId = computerAudioShortcut;
        this.setState({ currentAudioDevice: defaultDevice });
      }

      if (source.shortcutId) {
        const shortcut = this.shortcutService.get(source.shortcutId);

        if (!shortcut) {
          this.toastService.error(
            'The previous configured shortcut was not found. Please reassign it in the settings'
          );
          return;
        }

        source.shortcutSubscription = this.shortcutService.onShortcutPressed(
          shortcut,
          () => {
            this.onKeyDownHandler(source);
          }
        );
      }
    });

    this.setState({
      microphoneShortcut: this.shortcutService.get(microphoneShortcut),
      computerAudioShortcut: this.shortcutService.get(computerAudioShortcut),
    });

    const defaults = {
      computerAudio: {
        device: this.state.currentAudioDevice,
        shortcutId: computerAudioShortcut,
      },
      microphone: {
        device: this.state.currentMicrophoneDevice,
        shortcutId: microphoneShortcut,
      },
    };

    this.chatContext.appendToAuxiliaryBar(
      <InterviewWindow
        key={`interviewAssistant.auxiliaryBarWindow.${this.chatContext.chat.id}`}
        sendAudio={(audio) =>
          this.chatContext.session.sendMessage({ audio: audio })
        }
        onDeviceChange={(type, device) => {
          if (type === 'computerAudio') {
            this.onAudioDeviceChange(device);
          } else {
            this.onMicrophoneDeviceChange(device);
          }
        }}
        onDeviceShortcutChange={this.changeShortcutForDevice.bind(this)}
        defaults={defaults}
      />
    );
  }

  getSelectedShortcutsForDevice = (type: DeviceKind) => {
    if (type === 'computerAudio') {
      return this.state.computerAudioShortcut?.id;
    } else {
      return this.state.microphoneShortcut?.id;
    }
  };

  changeShortcutForDevice = (type: string, shortcutId: string) => {
    const shortcut = this.shortcutService.get(shortcutId);

    if (!shortcut) {
      this.toastService.error(
        'Shortcut not found. If you deleted it, please reassign it in the settings'
      );
      return;
    }

    let source: AudioSource;

    if (type === 'computerAudio') {
      if (this.state.microphoneShortcut?.id === shortcutId) {
        this.toastService.error('Shortcut already assigned to microphone');
        return;
      }

      source = this.state.audioSources[1];
      this.setState({ computerAudioShortcut: shortcut });
    } else {
      if (this.state.computerAudioShortcut?.id === shortcutId) {
        this.toastService.error('Shortcut already assigned to computer audio');
        return;
      }
      source = this.state.audioSources[0];
      this.setState({ microphoneShortcut: shortcut });
    }

    this.chatContext.setSettings({
      computerAudioShortcut: this.state.computerAudioShortcut?.id,
      microphoneShortcut: this.state.microphoneShortcut?.id,
    });

    this.tryOverrideDefaultShortcut();

    if (source.shortcutSubscription) {
      source.shortcutSubscription.unsubscribe();
    }

    source.shortcutSubscription = this.shortcutService.onShortcutPressed(
      shortcut,
      () => {
        this.onKeyDownHandler(source);
      }
    );
  };

  tryOverrideDefaultShortcut = (): void => {
    const settings = this.extensionContext.settings.get();

    const assignShortcutIfNotExists = (
      shortcutName: 'computerAudioShortcut' | 'microphoneShortcut'
    ) => {
      if (
        this.state[shortcutName] &&
        (!settings[shortcutName] ||
          !this.shortcutService.get(settings[shortcutName]))
      ) {
        console.log(
          'assigning shortcut',
          shortcutName,
          this.state[shortcutName]
        );
        this.extensionContext.settings.save(
          Object.assign(settings, {
            [shortcutName]: this.state[shortcutName]?.id,
          })
        );
      }
    };

    assignShortcutIfNotExists('computerAudioShortcut');
    assignShortcutIfNotExists('microphoneShortcut');
  };

  onKeyDownHandler = (source: AudioSource): void => {
    console.log('toggling recording...', source.shortcutId, source.id);

    if (
      this.state.audioSources.findIndex(
        (s) => s.controller.isRecording && s.id !== source.id
      ) === -1
    ) {
      source.controller.toggleRecording().catch((e) => {
        this.toastService.error(
          'Could not start recording: ' +
            JSON.stringify(e) +
            ' Please select a different device'
        );
        this.toastService.dismiss(RECORDING_TOAST_ID);
      });
    } else {
      this.toastService.error(
        'You can only record one audio source. Stop the current recording first',
        {
          position: 'top-center',
          autoClose: 1500,
        }
      );
    }
  };

  onSettingsUpdated?(settings: any): void {
    this.updateBrainInstructions();
  }

  validateSettings(settings: any): string | undefined {
    if (!settings.instructions)
      return 'Please enter instructions for the interview assistant';

    return undefined;
  }

  onChatUpdated?(chat: ChatInfo): void {}

  private updateBrainInstructions() {
    const settings = this.chatContext.getSettings();
    const members = this.chatContext.session.getMembers();

    const brainMembers = members.filter((m) => m.memberType === 'brain');

    brainMembers.forEach((brain) => {
      this.chatContext.session.changeMemberSettings(brain.id, {
        instructions: settings.instructions,
        ignorePreviousMessages: true,
      });
    });
  }

  async getDefaultDeviceOfType(
    type: MediaDeviceKind
  ): Promise<MediaDeviceInfo | undefined> {
    return navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => devices.find((d) => d.kind === type));
  }

  onAudioDeviceChange(device: MediaDeviceInfo): void {
    this.setState({ currentAudioDevice: device });

    this.changeAudioSourceDevice(this.state.audioSources[1], device.deviceId);
  }

  onMicrophoneDeviceChange(device: MediaDeviceInfo): void {
    this.setState({ currentMicrophoneDevice: device });

    this.changeAudioSourceDevice(this.state.audioSources[0], device.deviceId);
  }

  changeAudioSourceDevice(audioSource: AudioSource, newDeviceId: string): void {
    audioSource.controller.changeDevice(newDeviceId, audioSource.deviceKind);
  }

  dispose(): void {
    this.state.audioSources.forEach((source) => {
      source.shortcutSubscription?.unsubscribe();
      source.controller.customRecorder?.dispose();
    });

    this.state = { audioSources: [] };
  }

  private setState(state: Partial<State>) {
    Object.assign(this.state, state);
  }
}
