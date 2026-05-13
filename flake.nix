{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
        playwrightLibs = with pkgs; [
          alsa-lib
          dbus.lib
          gtk3
          pango
          atk
          cairo
          gdk-pixbuf
          libxcomposite
          libxdamage
          libxfixes
        ];
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
          ];
          nativeBuildInputs = with pkgs; [
            docker
            docker-compose
          ];
          shellHook = ''
            mkdir -p "$PWD/.corepack"
            corepack enable --install-directory="$PWD/.corepack"
            corepack prepare pnpm@10.27.0 --activate
            export PATH="$PWD/.corepack:$PATH"
            export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath playwrightLibs}:''${LD_LIBRARY_PATH:-}"
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
          '';
        };
      }
    );
}
