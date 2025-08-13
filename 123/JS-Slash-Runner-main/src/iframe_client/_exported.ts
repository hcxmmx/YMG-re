const SillyTavern = (
  window.parent as unknown as {
    SillyTavern: { getContext: () => Record<string, any> };
  }
).SillyTavern.getContext();

const TavernHelper = (window.parent as unknown as { TavernHelper: Record<string, any> }).TavernHelper;

for (const key in TavernHelper) {
  (window as any)[key] = TavernHelper[key];
}

const toastr = (window.parent as unknown as { toastr: any }).toastr;
const log = (window.parent as unknown as { log: any }).log;
const YAML = (window.parent as unknown as { YAML: any }).YAML;
const z = (window.parent as unknown as { z: any }).z;
z.config(z.locales.zhCN());

const EjsTemplate = (window.parent as unknown as { EjsTemplate: Record<string, any> }).EjsTemplate;

const Mvu = (window.parent as unknown as { Mvu: Record<string, any> }).Mvu;
