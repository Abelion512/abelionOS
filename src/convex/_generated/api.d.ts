/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as agents from "../agents.js";
import type * as auditChain from "../auditChain.js";
import type * as auth from "../auth.js";
import type * as companion from "../companion.js";
import type * as companionActions from "../companionActions.js";
import type * as companionInternals from "../companionInternals.js";
import type * as companionLogic from "../companionLogic.js";
import type * as companionSignature from "../companionSignature.js";
import type * as crons from "../crons.js";
import type * as crypto from "../crypto.js";
import type * as dashboard from "../dashboard.js";
import type * as deviceStates from "../deviceStates.js";
import type * as googleAccessToken from "../googleAccessToken.js";
import type * as googleAccounts from "../googleAccounts.js";
import type * as googleActions from "../googleActions.js";
import type * as googleExecutor from "../googleExecutor.js";
import type * as googleExecutorInternals from "../googleExecutorInternals.js";
import type * as googleOAuthActions from "../googleOAuthActions.js";
import type * as googleOAuthConfig from "../googleOAuthConfig.js";
import type * as googleOAuthState from "../googleOAuthState.js";
import type * as googleProposalSchema from "../googleProposalSchema.js";
import type * as googleRevoke from "../googleRevoke.js";
import type * as googleTasks from "../googleTasks.js";
import type * as googleTasksInternals from "../googleTasksInternals.js";
import type * as http from "../http.js";
import type * as mintdeskHelpers from "../mintdeskHelpers.js";
import type * as mintdeskInternals from "../mintdeskInternals.js";
import type * as news from "../news.js";
import type * as newsCacheInternals from "../newsCacheInternals.js";
import type * as newsFetchService from "../newsFetchService.js";
import type * as newsInternals from "../newsInternals.js";
import type * as newsParser from "../newsParser.js";
import type * as newsRegistry from "../newsRegistry.js";
import type * as newsSourceGuard from "../newsSourceGuard.js";
import type * as newsWatcher from "../newsWatcher.js";
import type * as newsWatcherInternals from "../newsWatcherInternals.js";
import type * as newsWatcherLogic from "../newsWatcherLogic.js";
import type * as observationLogic from "../observationLogic.js";
import type * as passwordCrypto from "../passwordCrypto.js";
import type * as pollPolicy from "../pollPolicy.js";
import type * as productLogic from "../productLogic.js";
import type * as productProposalActions from "../productProposalActions.js";
import type * as productReadActions from "../productReadActions.js";
import type * as productReadInternals from "../productReadInternals.js";
import type * as productReadLogic from "../productReadLogic.js";
import type * as products from "../products.js";
import type * as push from "../push.js";
import type * as pushInternals from "../pushInternals.js";
import type * as pushSubscriptions from "../pushSubscriptions.js";
import type * as retention from "../retention.js";
import type * as rssParser from "../rssParser.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  agents: typeof agents;
  auditChain: typeof auditChain;
  auth: typeof auth;
  companion: typeof companion;
  companionActions: typeof companionActions;
  companionInternals: typeof companionInternals;
  companionLogic: typeof companionLogic;
  companionSignature: typeof companionSignature;
  crons: typeof crons;
  crypto: typeof crypto;
  dashboard: typeof dashboard;
  deviceStates: typeof deviceStates;
  googleAccessToken: typeof googleAccessToken;
  googleAccounts: typeof googleAccounts;
  googleActions: typeof googleActions;
  googleExecutor: typeof googleExecutor;
  googleExecutorInternals: typeof googleExecutorInternals;
  googleOAuthActions: typeof googleOAuthActions;
  googleOAuthConfig: typeof googleOAuthConfig;
  googleOAuthState: typeof googleOAuthState;
  googleProposalSchema: typeof googleProposalSchema;
  googleRevoke: typeof googleRevoke;
  googleTasks: typeof googleTasks;
  googleTasksInternals: typeof googleTasksInternals;
  http: typeof http;
  mintdeskHelpers: typeof mintdeskHelpers;
  mintdeskInternals: typeof mintdeskInternals;
  news: typeof news;
  newsCacheInternals: typeof newsCacheInternals;
  newsFetchService: typeof newsFetchService;
  newsInternals: typeof newsInternals;
  newsParser: typeof newsParser;
  newsRegistry: typeof newsRegistry;
  newsSourceGuard: typeof newsSourceGuard;
  newsWatcher: typeof newsWatcher;
  newsWatcherInternals: typeof newsWatcherInternals;
  newsWatcherLogic: typeof newsWatcherLogic;
  observationLogic: typeof observationLogic;
  passwordCrypto: typeof passwordCrypto;
  pollPolicy: typeof pollPolicy;
  productLogic: typeof productLogic;
  productProposalActions: typeof productProposalActions;
  productReadActions: typeof productReadActions;
  productReadInternals: typeof productReadInternals;
  productReadLogic: typeof productReadLogic;
  products: typeof products;
  push: typeof push;
  pushInternals: typeof pushInternals;
  pushSubscriptions: typeof pushSubscriptions;
  retention: typeof retention;
  rssParser: typeof rssParser;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
