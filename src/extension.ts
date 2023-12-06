import { AppContext, ExtensionContext, IExtension } from '@hubai/core';
import { IChatAssistant, SettingType } from '@hubai/core';
import { InterviewAssistantController } from './interviewAssistantController';
import { ASSISTANT_ID, DEFAULT_PROMPT } from './consts';

export type InterviewAssistantSettings = {
  brainInstructions: string;
};

export class InterviewAssistant implements IExtension {
  id = 'interviewAssistant';
  name = 'Interview Assistant';

  appContext!: AppContext;

  activate(appContext: AppContext, extensionContext: ExtensionContext): void {
    this.appContext = appContext;

    const assistant: IChatAssistant = {
      id: ASSISTANT_ID,
      displayName: 'Interview Assistant',
      createController: () =>
        new InterviewAssistantController(this.appContext, extensionContext),
      getDefaultSettings: () => ({
        instructions:
          extensionContext.settings.get<InterviewAssistantSettings>()
            .brainInstructions ?? DEFAULT_PROMPT,
      }),
      settingsMap: [
        {
          name: 'instructions',
          displayName: 'Instructions',
          type: SettingType.STRING,
          defaultValue: DEFAULT_PROMPT,
          required: true,
        },
      ],
    };

    appContext.services.chatAssistantsManager.addAssistant(assistant);
  }

  dispose(appContext: AppContext): void {
    appContext.services.chatAssistantsManager.removeAssistant(
      'assistants.interviewAssistant'
    );
  }
}

const interviewAssistant = new InterviewAssistant();
export default interviewAssistant;
