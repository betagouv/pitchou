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
        isLinux = pkgs.stdenv.isLinux;
        playwrightLibs = pkgs.lib.optionals isLinux (
          with pkgs;
          [
            alsa-lib
            at-spi2-atk
            at-spi2-core
            atk
            cairo
            cups
            dbus.lib
            expat
            gdk-pixbuf
            glib
            gtk3
            libdrm
            libgbm
            libxkbcommon
            nspr
            nss
            pango
            libx11
            libxcb
            libxcomposite
            libxdamage
            libxext
            libxfixes
            libxrandr
          ]
        );
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_22
          ];
          nativeBuildInputs = with pkgs; [
            awscli2
            docker
            docker-compose
            postgresql
            scalingo
          ];
          shellHook = ''
            mkdir -p "$PWD/.corepack"
            corepack enable --install-directory="$PWD/.corepack"
            corepack prepare pnpm@10.27.0 --activate
            export PATH="$PWD/.corepack:$PATH"
            ${pkgs.lib.optionalString isLinux ''
              export LD_LIBRARY_PATH="${pkgs.lib.makeLibraryPath playwrightLibs}:''${LD_LIBRARY_PATH:-}"
            ''}
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
          '';
        };
      }
    );
}
