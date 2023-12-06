import React, { useState, useEffect } from 'react';
import { ShortcutSelector, component } from '@hubai/core';

const { Select, Option } = component;

export type DeviceKind = 'computerAudio' | 'microphone';

export type DeviceDefault = {
  device: MediaDeviceInfo | undefined;
  shortcutId: string;
}

export type Props = {
  sendAudio: (audio: Blob) => void;
  getDefaultDevice?: (kind: DeviceKind) => MediaDeviceInfo | undefined;
  onDeviceChange?: (kind: DeviceKind, device: MediaDeviceInfo) => void;
  getDefaultShortcutForDevice?: (kind: DeviceKind) => string | undefined;
  onDeviceShortcutChange?: (kind: DeviceKind, shortcut: string) => void;

  defaults: {
    computerAudio: DeviceDefault;
    microphone: DeviceDefault;
  }
};

export type DeviceSelectorProps = {
  devices: MediaDeviceInfo[];
  selectedDevice?: MediaDeviceInfo;
  onSelect: (device: MediaDeviceInfo) => void;
  label: string;
};
const DeviceSelector = ({
  devices,
  selectedDevice,
  onSelect,
  label,
}: DeviceSelectorProps) => {
  return (
    <div style={{ marginBottom: 10 }}>
      <label htmlFor="audio-selector">{label}</label>
      <Select
        id="audio-selector"
        value={selectedDevice?.deviceId ?? ''}
        onSelect={(e, option) => {
          const device = devices.find((d) => d.deviceId === option!.value);
          onSelect(device!);
        }}
        placeholder="Select the Audio Device"
      >
        {devices.map((device) => (
          <Option
            key={`option-${device.deviceId}`}
            value={device.deviceId}
            name={device.label}
            description={device.kind}
          >
            {device.label}
          </Option>
        ))}
      </Select>
    </div>
  );
};

export function InterviewWindow({
  getDefaultDevice,
  onDeviceChange,
  onDeviceShortcutChange,
  getDefaultShortcutForDevice,
  defaults,
}: Props) {
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<
    MediaDeviceInfo | undefined
  >(defaults?.computerAudio?.device);

  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>(
    []
  );

  const [selectedMicrophoneDevice, setSelectedMicrophoneDevice] = useState<
    MediaDeviceInfo | undefined
  >(defaults?.microphone?.device);

  const [selectedComputerAudioShortcutId, setSelectedComputerAudioShortcutId] =
    useState<string>(defaults?.computerAudio?.shortcutId ?? '');

  const [selectedMicrophoneShortcutId, setSelectedMicrophoneShortcutId] =
    useState<string>(defaults?.microphone?.shortcutId  ?? '');

  useEffect(() => {
    const getDevices = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(devices.filter((d) => d.kind === 'audiooutput'));
      setMicrophoneDevices(devices.filter((d) => d.kind === 'audioinput'));
    };

    getDevices();
  }, []);

  const audioChangedHandler = React.useCallback(
    (device: MediaDeviceInfo) => {
      setSelectedAudioDevice(device);
      onDeviceChange?.('computerAudio', device);
    },
    [onDeviceChange]
  );

  const microphoneChangedHandler = React.useCallback(
    (device: MediaDeviceInfo) => {
      setSelectedMicrophoneDevice(device);
      onDeviceChange?.('microphone', device);
    },
    [onDeviceChange]
  );

  return (
    <div className="youtube-summarizer__container">
      <DeviceSelector
        devices={microphoneDevices}
        onSelect={microphoneChangedHandler}
        selectedDevice={selectedMicrophoneDevice}
        label="Select the microphone device"
      />

      <ShortcutSelector
        label="Microphone Shortcut"
        style={{ marginBottom: 10 }}
        selectedShortcutId={selectedMicrophoneShortcutId}
        onChange={(shortcut) => {
          setSelectedMicrophoneShortcutId(shortcut.id);
          onDeviceShortcutChange?.('microphone', shortcut.id);
        }}
      />

      <DeviceSelector
        devices={audioDevices}
        onSelect={audioChangedHandler}
        selectedDevice={selectedAudioDevice}
        label="Select the audio device"
      />

      <ShortcutSelector
        label="Computer Audio Shortcut"
        selectedShortcutId={selectedComputerAudioShortcutId}
        style={{ marginBottom: 10 }}
        onChange={(shortcut) => {
          setSelectedComputerAudioShortcutId(shortcut.id);
          onDeviceShortcutChange?.('computerAudio', shortcut.id);
        }}
      />
    </div>
  );
}
