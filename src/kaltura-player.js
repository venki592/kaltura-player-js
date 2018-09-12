// @flow
import {Error, EventManager, EventType as CoreEventType, FakeEvent, FakeEventTarget, loadPlayer, Utils} from '@playkit-js/playkit-js';
import {EventType as UIEventType} from '@playkit-js/playkit-js-ui';
import {Provider} from 'playkit-js-providers';
import {supportLegacyOptions} from './common/utils/setup-helpers';
import getLogger from './common/utils/logger';
import {addKalturaParams} from './common/utils/kaltura-params';
import {evaluatePluginsConfig} from './common/plugins/plugins-config';
import {addKalturaPoster} from 'poster';
import './assets/style.css';
import {UIWrapper} from './common/ui-wrapper';
import {CastEventType} from './common/cast/cast-event-type';
import {RemotePlayerManager} from './common/cast/remote-player-manager';
import {BaseRemotePlayer} from './common/cast/base-remote-player';
import {RemoteSession} from './common/cast/remote-session';

class KalturaPlayer extends FakeEventTarget {
  _eventManager: EventManager;
  _mediaInfo: ?ProviderMediaInfoObject;
  _remotePlayer: ?BaseRemotePlayer;
  _localPlayer: Player;
  _provider: Provider;
  _uiWrapper: UIWrapper;
  _logger: any;
  _proxy: any;
  _proxyHandler: Object = {
    excluded: ['_remotePlayer', '_listeners'],
    get: function(kp: KalturaPlayer, prop: string) {
      if (prop in FakeEventTarget.prototype || this.excluded.includes(prop)) {
        // $FlowFixMe
        return kp[prop];
      }
      if (kp._remotePlayer && prop in kp._remotePlayer) {
        return kp._remotePlayer[prop];
      }
      // $FlowFixMe
      return kp[prop];
    },
    set: function(kp: KalturaPlayer, prop: string, value: any) {
      if (kp._remotePlayer && !this.excluded.includes(prop)) {
        if (prop in kp._remotePlayer) {
          kp._remotePlayer[prop] = value;
        }
      } else {
        // $FlowFixMe
        kp[prop] = value;
      }
      return true;
    }
  };

  constructor(options: KPOptionsObject) {
    super();
    this._eventManager = new EventManager();
    this._proxy = new Proxy(this, this._proxyHandler);
    this._localPlayer = loadPlayer(options);
    this._uiWrapper = new UIWrapper(this._proxy, options);
    this._provider = new Provider(options.provider, __VERSION__);
    this._logger = getLogger('KalturaPlayer' + Utils.Generator.uniqueId(5));
    Object.values(CoreEventType).forEach(coreEvent => this._eventManager.listen(this._localPlayer, coreEvent, e => this.dispatchEvent(e)));
    return this._proxy;
  }

  loadMedia(mediaInfo: ProviderMediaInfoObject): Promise<*> {
    this._logger.debug('loadMedia', mediaInfo);
    this._mediaInfo = mediaInfo;
    this.reset();
    this._localPlayer.loadingMedia = true;
    this._uiWrapper.setLoadingSpinnerState(true);
    return this._provider
      .getMediaConfig(mediaInfo)
      .then(mediaConfig => {
        this.setMedia(mediaConfig);
      })
      .catch(e =>
        this.dispatchEvent(new FakeEvent(this.Event.ERROR, new Error(Error.Severity.CRITICAL, Error.Category.PLAYER, Error.Code.LOAD_FAILED, e)))
      );
  }

  setMedia(mediaConfig: ProviderMediaConfigObject): void {
    this._logger.debug('setMedia', mediaConfig);
    const playerConfig = Utils.Object.copyDeep(mediaConfig);
    Utils.Object.mergeDeep(playerConfig.sources, this._localPlayer.config.sources);
    Utils.Object.mergeDeep(playerConfig.session, this._localPlayer.config.session);
    Object.keys(this._localPlayer.config.plugins).forEach(name => {
      playerConfig.plugins[name] = {};
    });
    addKalturaPoster(playerConfig.sources, mediaConfig.sources, this._localPlayer.dimensions);
    addKalturaParams(this, playerConfig);
    this._uiWrapper.setSeekbarConfig(mediaConfig, this._localPlayer.config.ui);
    this.configure(playerConfig);
  }

  getMediaInfo(): ?ProviderMediaInfoObject {
    return Utils.Object.copyDeep(this._mediaInfo);
  }

  configure(config: Object = {}): void {
    config = supportLegacyOptions(config);
    // $FlowFixMe
    evaluatePluginsConfig(config);
    this._localPlayer.configure(config);
    if (config.ui) {
      this._uiWrapper.setConfig(config.ui);
    }
  }

  ready(): Promise<*> {
    return this._localPlayer.ready();
  }

  load(): void {
    this._localPlayer.load();
  }

  play(): void {
    this._localPlayer.play();
  }

  pause(): void {
    this._localPlayer.pause();
  }

  getView(): HTMLElement {
    return this._localPlayer.getView();
  }

  getVideoElement(): ?HTMLVideoElement {
    return this._localPlayer.getVideoElement();
  }

  reset(): void {
    this._localPlayer.reset();
    this._uiWrapper.reset();
  }

  destroy(): void {
    const targetId = this.config.ui.targetId;
    this._localPlayer.destroy();
    this._uiWrapper.destroy();
    const targetContainer = document.getElementById(targetId);
    if (targetContainer && targetContainer.parentNode) {
      Utils.Dom.removeChild(targetContainer.parentNode, targetContainer);
    }
  }

  isLive(): boolean {
    return this._localPlayer.isLive();
  }

  isDvr(): boolean {
    return this._localPlayer.isDvr();
  }

  seekToLiveEdge(): void {
    this._localPlayer.seekToLiveEdge();
  }

  getStartTimeOfDvrWindow(): number {
    return this._localPlayer.getStartTimeOfDvrWindow();
  }

  getTracks(type?: string): Array<Track> {
    return this._localPlayer.getTracks(type);
  }

  getActiveTracks(): Object {
    return this._localPlayer.getActiveTracks();
  }

  selectTrack(track: ?Track): void {
    this._localPlayer.selectTrack(track);
  }

  hideTextTrack(): void {
    this._localPlayer.hideTextTrack();
  }

  enableAdaptiveBitrate(): void {
    this._localPlayer.enableAdaptiveBitrate();
  }

  isAdaptiveBitrateEnabled(): boolean {
    return this._localPlayer.isAdaptiveBitrateEnabled();
  }

  setTextDisplaySettings(settings: Object): void {
    this._localPlayer.setTextDisplaySettings(settings);
  }

  skipAd(): void {
    this._localPlayer.skipAd();
  }

  playAdNow(adTagUrl: string): void {
    this._localPlayer.playAdNow(adTagUrl);
  }

  isFullscreen(): boolean {
    return this._localPlayer.isFullscreen();
  }

  notifyEnterFullscreen(): void {
    this._localPlayer.notifyEnterFullscreen();
  }

  notifyExitFullscreen(): void {
    this._localPlayer.notifyExitFullscreen();
  }

  enterFullscreen(): void {
    this._localPlayer.enterFullscreen();
  }

  exitFullscreen(): void {
    this._localPlayer.exitFullscreen();
  }

  getLogLevel(name?: string): Object {
    return this._localPlayer.getLogLevel(name);
  }

  startCasting(type?: string): Promise<*> {
    return RemotePlayerManager.startCasting(type);
  }

  isCastAvailable(type?: string): boolean {
    return RemotePlayerManager.isCastAvailable(type);
  }

  getCastSession(): ?RemoteSession {
    return null;
  }

  stopCasting(): void {
    // Empty implementation
  }

  isCasting(): boolean {
    return false;
  }

  isVr(): boolean {
    return this._localPlayer.isVr();
  }

  toggleVrStereoMode(): void {
    this._localPlayer.toggleVrStereoMode();
  }

  isInVrStereoMode(): boolean {
    return this._localPlayer.isInVrStereoMode();
  }

  setLogLevel(level: Object, name?: string) {
    this._localPlayer.setLogLevel(level, name);
  }

  set textStyle(style: TextStyle): void {
    this._localPlayer.textStyle = style;
  }

  get textStyle(): ?TextStyle {
    return this._localPlayer.textStyle;
  }

  get buffered(): ?TimeRanges {
    return this._localPlayer.buffered;
  }

  set currentTime(to: number): void {
    this._localPlayer.currentTime = to;
  }

  get currentTime(): number {
    return this._localPlayer.currentTime;
  }

  get duration(): number {
    return this._localPlayer.duration;
  }

  set volume(vol: number): void {
    this._localPlayer.volume = vol;
  }

  get volume(): number {
    return this._localPlayer.volume;
  }

  get paused(): boolean {
    return this._localPlayer.paused;
  }

  get seeking(): boolean {
    return this._localPlayer.seeking;
  }

  set playsinline(playsinline: boolean): void {
    this._localPlayer.playsinline = playsinline;
  }

  get playsinline(): boolean {
    return this._localPlayer.playsinline;
  }

  set muted(mute: boolean): void {
    this._localPlayer.muted = mute;
  }

  get muted(): boolean {
    return this._localPlayer.muted;
  }

  get src(): string {
    return this._localPlayer.src;
  }

  get dimensions(): Object {
    return this._localPlayer.dimensions;
  }

  get poster(): string {
    return this._localPlayer.poster;
  }

  get ended(): boolean {
    return this._localPlayer.ended;
  }

  set playbackRate(rate: number): void {
    this._localPlayer.playbackRate = rate;
  }

  get playbackRate(): number {
    return this._localPlayer.playbackRate;
  }

  get playbackRates(): Array<number> {
    return this._localPlayer.playbackRates;
  }

  get defaultPlaybackRate(): number {
    return this._localPlayer.defaultPlaybackRate;
  }

  get engineType(): string {
    return this._localPlayer.engineType;
  }

  get streamType(): string {
    return this._localPlayer.streamType;
  }

  get env(): Object {
    return this._localPlayer.env;
  }

  get config(): Object {
    return this._localPlayer.config;
  }

  set loadingMedia(loading: boolean): void {
    this._localPlayer.loadingMedia = loading;
  }

  get Event(): KPEventTypes {
    return {
      Cast: CastEventType,
      Core: CoreEventType,
      UI: UIEventType,
      // For backward compatibility
      ...CoreEventType
    };
  }

  get TextStyle(): typeof TextStyle {
    return this._localPlayer.TextStyle;
  }

  get State(): PKStateTypes {
    return this._localPlayer.State;
  }

  get Track(): PKTrackTypes {
    return this._localPlayer.Track;
  }

  get LogLevelType(): PKLogLevelTypes {
    return this._localPlayer.LogLevelType;
  }

  get LogLevel(): PKLogLevels {
    return this._localPlayer.LogLevel;
  }

  get AbrMode(): PKAbrModes {
    return this._localPlayer.AbrMode;
  }

  get MediaType(): PKMediaTypes {
    return this._localPlayer.MediaType;
  }

  get StreamType(): PKStreamTypes {
    return this._localPlayer.StreamType;
  }

  get EngineType(): PKEngineTypes {
    return this._localPlayer.EngineType;
  }
}

export default KalturaPlayer;
