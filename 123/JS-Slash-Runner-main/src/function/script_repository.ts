import { ScriptData } from '@/component/script_repository/data';
import { ScriptManager } from '@/component/script_repository/script_controller';

type ScriptButton = {
  name: string;
  visible: boolean;
}

export function getScriptButtons(script_id: string): ScriptButton[] {
  if (!script_id) {
    throw new Error('脚本ID不能为空');
  }
  return ScriptManager.getInstance().getScriptButton(script_id);
}

export function replaceScriptButtons(script_id: string, buttons: ScriptButton[]): void {
  if (!script_id) {
    throw new Error(`脚本ID不能为空`);
  }

  const script = ScriptManager.getInstance().getScriptById(script_id);
  if (!script) {
    throw new Error(`脚本不存在: ${script_id}`);
  }

  const type = ScriptData.getInstance().getScriptType(script);

  script.buttons = buttons;
  ScriptManager.getInstance().setScriptButton(script, type);
}

export function appendInexistentScriptButtons(script_id: string, buttons: ScriptButton[]): void {
  const script_buttons = getScriptButtons(script_id);
  const inexistent_buttons = buttons.filter(button => !script_buttons.some(sb => sb.name === button.name));
  if (inexistent_buttons.length === 0) {
    return;
  }

  replaceScriptButtons(script_id, [...script_buttons, ...inexistent_buttons]);
}
