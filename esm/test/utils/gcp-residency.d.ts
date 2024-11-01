/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export declare class GCPResidencyUtil {
    stubs: any;
    constructor();
    /**
     * A simple utility for stubbing the networkInterface for GCE emulation.
     *
     * @param isGCE determines if the address should begin with `42:01` or not
     */
    setGCENetworkInterface(isGCE?: boolean): Promise<any>;
    /**
     * A simple utility for stubbing the platform for GCE emulation.
     *
     * @param platform a Node.js platform
     */
    setGCEPlatform(platform?: string): Promise<any>;
    /**
     * A simple utility for stubbing the Linux BIOS files for GCE emulation.
     *
     * @param isGCE options:
     *   - set `true` to simulate the files exist and are GCE
     *   - set `false` for exist, but are not GCE
     *   - set `null` for simulate ENOENT
     */
    setGCELinuxBios(isGCE: boolean | null): Promise<void>;
    /**
     * Removes serverless-related environment variables from the
     * environment (such as Cloud Run and Cloud Functions).
     */
    removeServerlessEnvironmentVariables(): Promise<void>;
    /**
     * Sets the environment as non-GCP by stubbing and setting/removing the
     * environment variables.
     */
    setNonGCP(): Promise<void>;
}
