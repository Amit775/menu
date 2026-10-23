import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((error: unknown) => {
  // The only place a console call is allowed: the app failed to start at all.
  // eslint-disable-next-line no-console -- no logger exists before bootstrap succeeds
  console.error(error);
});
