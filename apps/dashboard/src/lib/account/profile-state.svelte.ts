class ProfileState {
  revision = $state(0);

  invalidate = () => {
    this.revision += 1;
  };
}

export const profile_state = new ProfileState();
