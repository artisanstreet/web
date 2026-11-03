import { scenarios, Scene, type Scenario } from "../sign-in/scenarios.ts";

export type Scope = "sign-in" | "approve";

const in_scope = (scope: Scope, scenario: Scenario): boolean =>
  scope === "approve" ? Scene.$is("Approve")(scenario.scene) : Scene.$is("SignIn")(scenario.scene);

class DebugScenes {
  index = $state(-1);
  scope: Scope = $state("sign-in");
  list: ReadonlyArray<Scenario> = $derived(scenarios.filter((scenario) => in_scope(this.scope, scenario)));
  current: Scenario | undefined = $derived(this.list[this.index]);

  enter = (scope: Scope) => {
    if (scope === this.scope) return;
    this.scope = scope;
    this.index = -1;
  };

  step = (delta: number) => {
    const slots = this.list.length + 1;
    this.index = ((((this.index + 1 + delta) % slots) + slots) % slots) - 1;
  };
}

export const debug_scenes = new DebugScenes();
