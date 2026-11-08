class SidebarState {
  open = $state(true);

  toggle = () => {
    this.open = !this.open;
  };
}

export const sidebar_state = new SidebarState();
