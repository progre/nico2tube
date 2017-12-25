export default class Configuration {
  constructor(
    public readonly niconicoEmail: string,
    public readonly niconicoPassword: string,
    public readonly niconicoNoEconomy: boolean,
    public readonly workingFolderPath: string,
  ) {
  }
}
