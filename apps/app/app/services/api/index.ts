/**
 * This Api class lets you define an API endpoint and methods to request
 * data and process it.
 *
 * See the backend integration docs for more details.
 */
import {
  ApiResponse, // @demo remove-current-line
  ApisauceInstance,
  create,
} from "apisauce"

import Config from "@/config"
import { API_CONFIG } from "@/config/constants"
import type { EpisodeItem } from "@/services/api/types" // @demo remove-current-line
import { errorHandler } from "@/utils/ErrorHandler"
import { logger } from "@/utils/Logger"

import { GeneralApiProblem, getGeneralApiProblem } from "./apiProblem" // @demo remove-current-line
import type {
  ApiConfig,
  ApiFeedResponse, // @demo remove-current-line
} from "./types"

/**
 * Configuring the apisauce instance.
 */
export const DEFAULT_API_CONFIG: ApiConfig = {
  url: Config.API_URL,
  timeout: API_CONFIG.TIMEOUT,
}

const isLocalHost = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "10.0.2.2" ||
  hostname.endsWith(".local") ||
  hostname.startsWith("192.168.")

const enforceSecureBaseUrl = (url: string) => {
  if (!url) {
    const message = "API base URL is not configured"
    if (__DEV__) {
      logger.warn(message)
      return
    }
    throw new Error(message)
  }

  try {
    const parsed = new URL(url)
    const isHttps = parsed.protocol === "https:"

    if (!isHttps && !(__DEV__ && isLocalHost(parsed.hostname))) {
      const message = `API base URL must use HTTPS in production (${url})`
      if (__DEV__) {
        logger.warn(message)
      } else {
        throw new Error(message)
      }
    }
  } catch {
    const message = "API base URL is invalid"
    if (__DEV__) {
      logger.warn(message, { url })
    } else {
      throw new Error(message)
    }
  }
}

/**
 * Manages all requests to the API. You can use this class to build out
 * various requests that you need to call from your backend API.
 */
export class Api {
  apisauce: ApisauceInstance
  config: ApiConfig

  /**
   * Set up our API instance. Keep this lightweight!
   */
  constructor(config: ApiConfig = DEFAULT_API_CONFIG) {
    this.config = config
    enforceSecureBaseUrl(this.config.url)
    this.apisauce = create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        Accept: "application/json",
      },
    })

    this.setupInterceptors()
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors() {
    // Request interceptor
    this.apisauce.addRequestTransform((request) => {
      if (__DEV__) {
        // Logger automatically redacts sensitive data (passwords, tokens, etc.)
        logger.debug(`API Request: ${request.method?.toUpperCase()} ${request.url}`, {
          params: request.params,
          data: request.data,
        })
      }
    })

    // Response interceptor
    this.apisauce.addResponseTransform((response) => {
      if (__DEV__) {
        logger.debug(`API Response: ${response.status} ${response.config?.url}`, {
          duration: response.duration,
          problem: response.problem,
        })
      }

      // Handle global errors here if needed (e.g. 401 logout)
      if (response.status === 401) {
        logger.warn("API Unauthorized", { url: response.config?.url })
        // Could trigger logout here via event emitter or similar
      }
    })
  }

  // @demo remove-block-start
  /**
   * Gets a list of recent React Native Radio episodes.
   */
  async getEpisodes(): Promise<{ kind: "ok"; episodes: EpisodeItem[] } | GeneralApiProblem> {
    // make the api call
    const response: ApiResponse<ApiFeedResponse> = await this.apisauce.get(
      `api.json?rss_url=https%3A%2F%2Ffeeds.simplecast.com%2FhEI_f9Dx`,
    )

    // the typical ways to die when calling an api
    if (!response.ok) {
      const problem = getGeneralApiProblem(response)
      if (problem) {
        // Log the error
        errorHandler.handle(new Error(problem.kind), {
          context: "api_getEpisodes",
          problem,
          status: response.status,
        })
        return problem
      }
    }

    // transform the data into the format we are expecting
    try {
      const rawData = response.data

      // This is where we transform the data into the shape we expect for our model.
      const episodes: EpisodeItem[] =
        rawData?.items.map((raw) => ({
          ...raw,
        })) ?? []

      return { kind: "ok", episodes }
    } catch (e) {
      if (__DEV__ && e instanceof Error) {
        logger.error(`Bad data: ${e.message}\n${response.data}`, {}, e)
      }
      return { kind: "bad-data" }
    }
  }
  // @demo remove-block-end
}

// Singleton instance of the API for convenience
export const api = new Api()
