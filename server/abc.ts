import { detected, DeviceEnabledType, getTZOffsetHours, HistoryDecoratedDatastore, HistoryStore, getTZOffsetDate, isDayRollover, isHourRollover, isMonthRollover, isYearRollover, mean, Milliseconds, ObjectHistory, openClosed, roundDecimals, System, SYSTEM, ThingShadowState, timestampToMS } from '@iotv/datamodel-core';
import { ErrDataPromise, NumNullArr, TypedStateSnapshot, ValidBusinessObject, StateSnapshot } from '@iotv/iotv-v3-types';
import { CalculateSiloHVPResult } from '../../../model/Silo/calculateHVP';
import { Silo, SiloEventType, SiloProps } from '../../../model/Silo';
import { CalculatedState, DistanceCalculationAtts, IV016CalculatedState } from './CalculatedState';
import { DistanceCalculationStatus, DistanceCalculationType, iterateDistCalc } from './distanceCalculations';
import { DistanceFilterParams, getCalculatedStateParams, getPowerBinParams, V016CalculatedStateParams } from './getCalcStateParams';
import { applyFilter, filteredOutputKeys } from './ObjectHistoryFilter/applyFilter';
import { diagnosticSnapshotType, DistanceDetectorMeasurementResultsType, SiloCalculationInputParams } from './types';
import { UplinkPayloadInstance } from './UplinkPayloadInstance';
import { DiagnosticModeValuesType } from './types';
import { initializeV016ObjectHistory } from './initializeObjectHistory';
import { findLineByLeastSquares } from './linerRegression';
import { toEsp } from '../../../../../UI/src/data/NetworkSystem/Math/ESPfromRSSI_SNR';
import { cutOff, findPeak, pbAverage, boostCalculation, binMiddle, peakAndFloor, distanceCalculation, averageNotNull, rowAveraging, rollingAveraging, periodiseHistory2 } from '../../../model/Silo/PBCalculation';
import { SEARCHLENGTH, DEFAULTTHRESHOLDS, DEFAULTBOOST, PERIODISELENGTH } from '../../../model/Silo';
import { start } from 'repl';
import { cpuUsage } from 'process';
import path from 'path'
import { getNiceDate } from "@iotv/datamodel-core";
import { PERIODISELENGTH4 } from '../../../model/Silo/constants';

import { integer } from 'aws-sdk/clients/cloudfront';


const debugOverride = process.env.DEBUG_OVERRIDE === 'true';
const debug = ((!process.env.AWS_SESSION_TOKEN || process.env.REACT_APP_DEBUG) && true) || debugOverride;

const fillEventD1PBinsMeanSDFactor = 1; // how many sds change exceeds sd to indicate single step in fill cycle
const consureEventD1PBinsMeanSDFactor = 1; // how many negative sds change exceeds sd indicate single step in consume cycle

function timeConverter(UNIX_timestamp: integer) {
    var a = new Date(UNIX_timestamp * 1000);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec;
    return time;
}

export const v016ObjectHistoryKeys = {
    recentStateHistory: {
        tankLevel: 'tankLevel',
        current_filled_volume: 'current_filled_volume',

    },
    dailyStateHistory: {
        volumeM3UsedDay: 'volumeM3UsedDay',
        volumeM3: 'volumeM3',
        batteryVoltage: 'batteryVoltage',
        percentage: 'percentage',
        contentHeightMtrs: 'contentHeightMtrs'
    },
    filteredHistoryStore: {
        acceptedPBinsMean: 'acceptedPBinsMean',
        diff1PBinsMean: 'diff1PBinsMean',
        dist1: 'dist1',
        dist2: 'dist2',
        pBinsMean: 'pBinsMean',
        contentHeightMtrs: 'contentHeightMtrs'
    },
    fillConsumeHistoryStore: {
        fillEvent: 'fillEvent',
        consumeEvent: 'consumeEvent'
    },
    diagnosticHistoryStore: {
        diagF1Addr: 'diagF1Addr',
        diagF2Addr: 'diagF2Addr',
        diagF3Addr: 'diagF3Addr',
        diagF1Val: 'diagF1Val',
        diagF2Val: 'diagF2Val',
        diagF3Val: 'diagF3Val'
    },
    bestFitHistoryStore: {
        volumeM3: 'volumeM3',
        dailyUsage: 'dailyUsage'
    },
    threeHourStateHistory: {
        volumeM3: 'volumeM3',
        contentHeightMtrs: 'contentHeightMtrs'
    },
    oneHourStateHistory: {
        topConeVol: 'topConeVol',
        topConePercentage: 'topConePercentage',
        barrelVol: 'barrelVol',
        barrelPercentage: 'barrelPercentage',
        bottomConeVol: 'bottomConeVol',
        bottomConePercentage: 'bottomConePercentage',
        contentHeightMtrs: 'contentHeightMtrs',
        contentHeightPercentage: 'contentHeightPercentage',
        contentWeight: 'contentWeight',
        contentWeightPercentage: 'contentWeightPercentage',
    },
    pbReadingStateHistory: {
    },
    periodisedDistHistory: {
        dist1: 'dist1',
        dist2: 'dist2',
        dist3: 'dist3',
        dist4: 'dist4',
        dist5: 'dist5',
        dist6: 'dist6',
        startTimestamp: 'startTimestamp',
        stopTimestamp: 'stopTimestamp',
        avg: 'avg',
        volumeM3: 'volumeM3',
        percentage: 'percentage',
        contentHeightMtrs: 'contentHeightMtrs'
    }

}

export type v016RecentHistoryKeys = keyof typeof v016ObjectHistoryKeys.recentStateHistory //'current_filled_volume'
export type v016DailytHistoryKeys = keyof typeof v016ObjectHistoryKeys.dailyStateHistory
export type v016HistoryType = {
    recentStateHistory: Required<Pick<IV016CalculatedState, 'Fill_Percentage' | 'payload' | 'batteryVoltage' | 'lidMovementDetected' | 'lidOrientation' | 'messageType' | 'rssi' | 'snr' | 'esp'>>,
    dailyStateHistory: {
        volumeM3UsedDay: number | null,
        batteryVoltage: number | null,
        volumeM3: number | null,
        percentage: number | null;
        contentHeightMtrs: number | null
    },
    filteredHistoryStore: {
        // acceptedPBinsMean: number | null,
        // diff1PBinsMean: number | null,
    },
    fillConsumeHistoryStore: {
        fillEvent: number | null,
        consumeEvent: number | null,
    },
    diagnosticHistoryStore: {
        diagF1Addr: number | null,
        diagF2Addr: number | null,
        diagF3Addr: number | null,
        diagF1Val: number | null,
        diagF2Val: number | null,
        diagF3Val: number | null,
        dist3: number | null,
        dist4: number | null,
        dist5: number | null,
        dist6: number | null,
        amp3: number | null,
        amp4: number | null,
        amp5: number | null,
        amp6: number | null,
    },
    bestFitHistoryStore: {
        volumeM3: number | null,
        dailyUsage: number | null,
    },
    threeHourStateHistory: {
        volumeM3: number | null,
        contentHeightMtrs: number | null,
    },
    pbReadingStateHistory: {

    }
    calculationStateHistory: {
        average: number,
        cutoff: number[],
        peak: number[],

        boosterPb1: number,
        boosterPb2: number,
        boosterPb3: number,
        boosterPb4: number,
        boosterPb5: number,
        boosterPb6: number,
        boosterPb7: number,
        boosterPb8: number,
        boosterPb9: number,
        boosterPb10: number,
        boosterPb11: number,
        boosterPb12: number,
        boosterPb13: number,
        boosterPb14: number,
        boosterPb15: number,
        boosterPb16: number,
        boosterPb17: number,
        boosterPb18: number,
        boosterPb19: number,
        boosterPb20: number,


        boostedPb1: number,
        boostedPb2: number,
        boostedPb3: number,
        boostedPb4: number,
        boostedPb5: number,
        boostedPb6: number,
        boostedPb7: number,
        boostedPb8: number,
        boostedPb9: number,
        boostedPb10: number,
        boostedPb11: number,
        boostedPb12: number,
        boostedPb13: number,
        boostedPb14: number,
        boostedPb15: number,
        boostedPb16: number,
        boostedPb17: number,
        boostedPb18: number,
        boostedPb19: number,
        boostedPb20: number,

        dist1: number | null,
        dist2: number | null,
        snr1: number | null,
        snr2: number | null,
        cutOff1: number | null,
        cutOff2: number | null,
        cutOff3: number | null,

        messageType: string | null,
        rssi?: number | null
        snr?: number | null
        esp?: number | null
    },
    periodisedCalculationStateHistory: {
        dist1: number,
        dist2: number,
        snr1: number,
        snr2: number,
        startTimestamp: number,
        stopTimestamp: number
    },
    periodisedDDStateHistory: {
        dist3: number,
        dist4: number,
        dist5: number,
        dist6: number,
        amp3: number,
        amp4: number,
        amp5: number,
        amp6: number,
        startTimestamp: number,
        stopTimestamp: number,
    },
    mergedCombineHistory: {
        dist1: number | null,
        dist2: number | null,
        snr1: number | null,
        snr2: number | null,
        dist3: number | null,
        dist4: number | null,
        dist5: number | null,
        dist6: number | null,
        amp3: number | null,
        amp4: number | null,
        amp5: number | null,
        amp6: number | null,
    },
    periodisedDistHistory: {
        dist1: number | null,
        dist2: number | null,
        dist3: number | null,
        dist4: number | null,
        dist5: number | null,
        dist6: number | null,
        startTimestamp: number | null,
        stopTimestamp: number | null,
        avg: number | null,
        volumeM3: number | null,
        percentage: number | null;
        contentHeightMtrs: number | null
    }

}

export type V016ReturnedStateType = {
    updatedThingObject: Silo & ValidBusinessObject | undefined, calculatedState: Partial<CalculatedState>, objectHistory: ObjectHistory | undefined
}



const getTZOffsetForThing = (thing: ValidBusinessObject, timestamp?: number) => getTZOffsetHours((thing as DeviceEnabledType<any>).tz ? thing.tz : 'Pacific/Auckland', timestamp ? new Date(timestamp) : undefined);

export const calculateState = async (datastore: HistoryDecoratedDatastore, thing: ValidBusinessObject, thingShadowState: ThingShadowState, objectHistory: ObjectHistory | undefined): ErrDataPromise<V016ReturnedStateType> => {
    //debug && console.log('objectHistory', objectHistory)


    if (!(thing.type === 'Silo')) {
        console.log('Not Silo', thing);
        return { err: new Error('not silo'), data: null }
    }
    if (!objectHistory) {
        console.log('No object history', objectHistory);
        objectHistory = ObjectHistory.createForObject(thing, {
            recentStateHistory: true, dailyStateHistory: true,
            // ThreeHourStateHistory: true, SixHourStateHistory: true, TwelveHourStateHistory: true 
        })
    } else {

    }

    const getSystem = async (): ErrDataPromise<Partial<System<SiloCalculationInputParams>>> => {
        if (datastore.getOne) {
            const system: ValidBusinessObject | undefined = await datastore.getOne(SYSTEM) as ValidBusinessObject | undefined
            return { err: null, data: system ?? null }
        } else {
            const warning = 'datastore has no function getOne';
            console.log(`WARNING: ${warning}`)
            return { err: new Error(warning), data: null }
        }
    }

    initializeV016ObjectHistory(objectHistory) // this will add filteredHistoryStore, fillConsumeHistoryStore, diagnosticHistoryStore

    let rssi: number | null = null;
    let snr: number | null = null;
    let esp: number | null = null;
    // const { fCnt, snr, rssi } = thingShadowState.payload.state.reported.meta ?? {};
    if (thingShadowState.payload.state.reported.meta?.rssi && thingShadowState.payload.state.reported.meta?.snr) {
        rssi = thingShadowState.payload.state.reported.meta.rssi;
        snr = thingShadowState.payload.state.reported.meta.snr;
    }

    if (rssi && snr && toEsp(rssi, snr)) {
        esp = toEsp(rssi, snr) ?? null;
    }
    //debug && console.log('network data', thingShadowState, snr, rssi, esp)

    const silo = new Silo(thing) as Silo & { sk: string, pk: string, type: string, id: string } & SiloProps

    let result: { err: Error | null, data: V016ReturnedStateType } = { err: null, data: { updatedThingObject: silo, calculatedState: {}, objectHistory } }
    //debug && console.log('testwork1', silo.lastVolumeM3);
    try {

        console.log(`silo:${thing.id}, ${thing.name} is in calcualteState`)

        const systemRes = await getSystem();
        const siloCalculationInputParams: SiloCalculationInputParams = systemRes.data?.siloCalculationInputParams ?? {}

        const siloTotalInternalHeightMM = silo.totalContentFillableHeightMM
        //debug && console.log('siloTotalInternalHeightMM', siloTotalInternalHeightMM)
        if (isNaN(siloTotalInternalHeightMM)) {
            throw (new Error(`Silo ${silo.sk} does not have dimensions set correctly`))
        }
        if (siloTotalInternalHeightMM < 100) {
            throw (new Error(`Silo ${silo.sk} has siloTotalInternalHeightMM in meteres`))
        }
        const { NOISE_FLOOR_MARGIN = 0.1 } = siloCalculationInputParams;

        const DIST_CALC_RANGE_START = silo._rangeStart;
        const DIST_CALC_RANGE_LENGTH = silo._rangeLength;

        const metrics = thingShadowState.metrics
        //debug && console.log('tss metrics', metrics)
        const payload: string | null = metrics?.decodedPayload ?? null
        silo.deviceBatteryVoltage = metrics?.batteryVoltage ?? silo.deviceBatteryVoltage

        const powerbinDistanceRes: DistanceCalculationType | undefined = metrics ? iterateDistCalc(metrics.powerBin1ByteRecords as number[], DIST_CALC_RANGE_START, DIST_CALC_RANGE_LENGTH, NOISE_FLOOR_MARGIN) : undefined

        const distanceDetectorRes: Partial<DistanceDetectorMeasurementResultsType> = (metrics?.distanceRecords as unknown as DistanceDetectorMeasurementResultsType) ?? {}

        const { status, batteryVoltage } = metrics as UplinkPayloadInstance;
        const { lidMovementDetected, lidOrientation } = status ?? {}

        const currentTimestamp = timestampToMS(thingShadowState.payload.timestamp ?? thingShadowState.payload.state.reported.meta?.timestamp) ?? 0;
        const tzOffset = getTZOffsetForThing(thing, currentTimestamp);

        /*
            DIAGNOSTIC MODE VALS
        */
        let messageType = null;
        const diagnosticModeValuesRes: Partial<DiagnosticModeValuesType> = (metrics?.diagnosticModeValues as unknown as DiagnosticModeValuesType) ?? {}
        const { diagCfgIdx, diagFAddr, diagFVal } = diagnosticModeValuesRes;
        const [diagF1Addr, diagF2Addr, diagF3Addr] = diagFAddr ?? [];
        const [diagF1Val, diagF2Val, diagF3Val] = diagFVal ?? [];

        const { detectedPeaks, peakAmp, peakDistanceMM } = distanceDetectorRes;
        const [dist3, dist4, dist5, dist6] = peakDistanceMM ?? [];
        const [pb1, pb2, pb3, pb4, pb5, pb6, pb7, pb8, pb9, pb10, pb11, pb12, pb13, pb14, pb15, pb16, pb17, pb18, pb19, pb20] = metrics?.powerBin1ByteRecords ?? []
        const [amp3, amp4, amp5, amp6] = peakAmp ?? [];

        //debug && console.log('peakDistanceMM', peakDistanceMM, 'peakAmp', peakAmp)

        //debug && console.log('metrics?.powerBin1ByteRecords', metrics?.powerBin1ByteRecords)

        if (diagCfgIdx || diagF1Addr || diagF2Addr || diagF3Addr || diagF1Val || diagF2Val || diagF3Val) {
            const diagnosticSnapshot: TypedStateSnapshot<v016HistoryType['diagnosticHistoryStore']> = {
                timestamp: currentTimestamp, state: {
                    diagF1Addr, diagF2Addr, diagF3Addr, diagF1Val, diagF2Val, diagF3Val,
                    dist3, dist4, dist5, dist6,
                    amp3, amp4, amp5, amp6
                }
            }

            objectHistory.diagnosticHistoryStore.push(diagnosticSnapshot)
        }

        let calculatedShadowAtts: CalculatedState = {
            batteryVoltage: silo.deviceBatteryVoltage ?? null
            , lidMovementDetected: lidMovementDetected as detected
            , lidOrientation: lidOrientation as openClosed
            , payload
            , Fill_Percentage: null, // todo
            daysToEmpty: silo.daysToEmpty ?? null,
            fillEvent: silo.fillEvent ?? null,
            fillEventT: silo.convertM3ToTonne(silo.fillEvent) ?? null
        }

        if (objectHistory?.payloadsHistory) {
            const stateUpdate = {
                timestamp: currentTimestamp,
                state: {
                    messageType,
                    payload,
                }
            }
            objectHistory?.payloadsHistory.push(stateUpdate)
        }



        if (objectHistory?.recentStateHistory) {
            const stats = objectHistory.recentStateHistory.getStatistics()

            const systemProvidedCacluatedStateParams: V016CalculatedStateParams | undefined = SYSTEM.calculatedStateParams ? {
                ...SYSTEM.calculatedStateParams, dataFilter: {
                    ...SYSTEM.calculatedStateParams.dataFilter,
                    powerBinParams: getPowerBinParams(silo, stats)
                }
            } : undefined



            const calulatedStateParams: V016CalculatedStateParams | undefined = systemProvidedCacluatedStateParams ?? getCalculatedStateParams(silo, stats)

            if (!SYSTEM.calculatedStateParams) {
                // //debug && console.log('Not using system params')
            } else {
                // //debug && console.log('Using system params with silo specific powerBinParams', systemProvidedCacluatedStateParams )
            }


            if (powerbinDistanceRes?.status === DistanceCalculationStatus.PASS || distanceDetectorRes) {
                if (powerbinDistanceRes?.status === DistanceCalculationStatus.PASS) {
                    messageType = 'AppPwrBins-1';
                } else if (detectedPeaks) {
                    messageType = 'Dist-Det';
                } else {
                    messageType = 'System'
                }

                const { dist1, dist2, snr1, snr2 } = powerbinDistanceRes ?? { dist1: null, dist2: null, snr1: null, snr2: null }


                //debug && console.log('peakDistanceMMCalculate', amp3)

                const lastRecemtStateHistoryIdx = objectHistory?.recentStateHistory?.getLastIndex();

                const lastRecentStateTimestamp = lastRecemtStateHistoryIdx ? (objectHistory?.recentStateHistory?.timestamp[lastRecemtStateHistoryIdx] ?? -1) : 0
                const hourRollover = lastRecentStateTimestamp && currentTimestamp ? isHourRollover(lastRecentStateTimestamp, currentTimestamp, tzOffset) : false;
                const dayRollover = lastRecentStateTimestamp && currentTimestamp ? isDayRollover(lastRecentStateTimestamp, currentTimestamp, tzOffset) : false;
                const monthRollover = lastRecentStateTimestamp && currentTimestamp ? isMonthRollover(lastRecentStateTimestamp, currentTimestamp, tzOffset) : false;
                const yearRollover = lastRecentStateTimestamp && currentTimestamp ? isYearRollover(lastRecentStateTimestamp, currentTimestamp, tzOffset) : false;




                const distanceCalculationAtts: { powerBin1ByteRecords: number[] | null, Fill_Percentage: number | null, } = {
                    // dist1: dist1 ? Math.round(dist1) : dist1,
                    // dist2: dist2 ? Math.round(dist2) : dist2,
                    // snr1: snr1 ? roundDecimals(snr1, 2) : snr1,
                    // snr2: snr2 ? roundDecimals(snr2, 2) : snr2,

                    Fill_Percentage: calculatedShadowAtts.Fill_Percentage,
                    powerBin1ByteRecords: metrics?.powerBin1ByteRecords,
                }

                const detectorAtts = {
                    dist3: dist3 ? Math.round(dist3) : dist3,
                    dist4: dist4 ? Math.round(dist4) : dist4,
                    dist5: dist5 ? Math.round(dist5) : dist5,
                    dist6: dist6 ? Math.round(dist6) : dist6,
                    amp3,
                    amp4,
                    amp5,
                    amp6,
                    distanceDetectorRes: metrics?.distanceDetectorRes,
                }

                const pbRawRes = {
                    pb1, pb2, pb3, pb4, pb5, pb6, pb7, pb8, pb9, pb10, pb11, pb12, pb13, pb14, pb15, pb16, pb17, pb18, pb19, pb20
                }

                const stateUpdate: TypedStateSnapshot<v016HistoryType['recentStateHistory']> = {
                    timestamp: currentTimestamp,
                    state: {
                        messageType,
                        ...calculatedShadowAtts,
                        ...distanceCalculationAtts,
                        ...detectorAtts,
                        ...pbRawRes,
                        payload,
                        batteryVoltage: silo.deviceBatteryVoltage ?? null,
                        rssi, snr, esp
                    }
                }

                //debug && console.log('update recentStateHistory', stateUpdate)
                const mergeLast = false

                if (currentTimestamp - lastRecentStateTimestamp < calulatedStateParams.thingShadowState.mergeWhenTimestampsWithinMS) {
                    if (mergeLast) {
                        if (stateUpdate.state.messageType === 'Dist-Det') {
                            objectHistory.recentStateHistory.mergeLast(stateUpdate)
                        }

                    } else {
                        if (stateUpdate.state.messageType === 'Dist-Det') {
                            objectHistory.recentStateHistory.push(stateUpdate)
                        }

                    }

                } else {
                    objectHistory.recentStateHistory.push(stateUpdate)
                }


                if (objectHistory?.pbReadingStateHistory && metrics?.powerBin1ByteRecords && objectHistory?.calculationStateHistory) {
                    // silo.lastUpdateTimestamp = currentTimestamp;

                    const pbh = objectHistory.pbReadingStateHistory;
                    //debug && console.log('pbReadingStateHistory exist')
                    const pbStateUpdate: TypedStateSnapshot<v016HistoryType['pbReadingStateHistory']> = {
                        timestamp: currentTimestamp,
                        state: {
                            ...pbRawRes,
                        }
                    }

                    const csh = objectHistory.calculationStateHistory;
                    const pbValues = [pb1, pb2, pb3, pb4, pb5, pb6, pb7, pb8, pb9, pb10, pb11, pb12, pb13, pb14, pb15, pb16, pb17, pb18, pb19, pb20];
                    //debug && console.log('pbValues length', pbValues.length);
                    const average = pbAverage(pbValues);
                    const cutoff = cutOff(pbValues, silo.thresholds.length > 0 ? silo.thresholds : DEFAULTTHRESHOLDS);
                    const peak = findPeak(pbValues, silo.thresholds.length > 0 ? silo.thresholds : DEFAULTTHRESHOLDS);

                    const [boosterPb1, boosterPb2, boosterPb3, boosterPb4, boosterPb5, boosterPb6, boosterPb7, boosterPb8, boosterPb9, boosterPb10, boosterPb11, boosterPb12, boosterPb13, boosterPb14, boosterPb15, boosterPb16, boosterPb17, boosterPb18, boosterPb19, boosterPb20] = Array(20).fill(0);
                    const [boostedPb1, boostedPb2, boostedPb3, boostedPb4, boostedPb5, boostedPb6, boostedPb7, boostedPb8, boostedPb9, boostedPb10, boostedPb11, boostedPb12, boostedPb13, boostedPb14, boostedPb15, boostedPb16, boostedPb17, boostedPb18, boostedPb19, boostedPb20] = pbValues;
                    objectHistory.calculationStateHistory = csh.getLength() > 0 ? boostCalculation(peak, SEARCHLENGTH, csh, pbh, pbValues, silo.boost >= 0 ? silo.boost : DEFAULTBOOST, silo.thresholds.length > 0 ? silo.thresholds : DEFAULTTHRESHOLDS, DIST_CALC_RANGE_LENGTH, DIST_CALC_RANGE_START) : new HistoryStore();

                    const [cutOff1, cutOff2, cutOff3] = cutOff(pbValues, silo.thresholds.length > 0 ? silo.thresholds : DEFAULTTHRESHOLDS);
                    const mid = binMiddle(DIST_CALC_RANGE_LENGTH);
                    const [peak1, floor] = peakAndFloor(pbValues, silo.thresholds.length > 0 ? silo.thresholds : DEFAULTTHRESHOLDS);

                    const [dist, calsnr] = distanceCalculation(peak1, floor, mid, DIST_CALC_RANGE_START);
                    const [dist1, dist2] = dist;
                    const [snr1, snr2] = calsnr;
                    console.log('dist1', dist1, dist2, DIST_CALC_RANGE_START)

                    const calculationStateSnapshot: TypedStateSnapshot<v016HistoryType['calculationStateHistory']> = {
                        timestamp: currentTimestamp,
                        state: {
                            messageType,
                            average,
                            cutoff,
                            peak,
                            boosterPb1, boosterPb2, boosterPb3, boosterPb4, boosterPb5, boosterPb6, boosterPb7, boosterPb8, boosterPb9, boosterPb10, boosterPb11, boosterPb12, boosterPb13, boosterPb14, boosterPb15, boosterPb16, boosterPb17, boosterPb18, boosterPb19, boosterPb20,
                            boostedPb1, boostedPb2, boostedPb3, boostedPb4, boostedPb5, boostedPb6, boostedPb7, boostedPb8, boostedPb9, boostedPb10, boostedPb11, boostedPb12, boostedPb13, boostedPb14, boostedPb15, boostedPb16, boostedPb17, boostedPb18, boostedPb19, boostedPb20,
                            dist1, dist2,
                            snr1, snr2,
                            cutOff1, cutOff2, cutOff3,
                            rssi, snr, esp
                        }
                    };

                    //debug && console.log('calculationStateSnapshot', calculationStateSnapshot)
                    objectHistory.calculationStateHistory.push(calculationStateSnapshot);


                    //debug && console.log('pbStateUpdate', pbStateUpdate)
                    pbh.push(pbStateUpdate);


                }



                if (objectHistory.recentStateHistory && objectHistory.calculationStateHistory && objectHistory.rollingAverageHistory && objectHistory.mergedCombineHistory && objectHistory.periodisedDistHistory) {
                    // PBD & DD already updated

                    const newMergeHistory = new HistoryStore()

                    const rsh = objectHistory.recentStateHistory
                    const csh = objectHistory.calculationStateHistory

                    // //debug && console.log('rsh', rsh, 'csh', csh)


                    const rshLength = rsh.getLength()
                    const cshLength = csh.getLength()


                    const stateSnapshotArr = []

                    for (var i = rshLength - SEARCHLENGTH >= 0 ? rshLength - SEARCHLENGTH : 0; i < rshLength; i++) {
                        const stateSnapshot = rsh.getStateSnapshotByIndex(i)
                        if (stateSnapshot) {
                            stateSnapshotArr.push(stateSnapshot)
                        }
                    }

                    for (var i = cshLength - SEARCHLENGTH >= 0 ? cshLength - SEARCHLENGTH : 0; i < cshLength; i++) {
                        const stateSnapshot = csh.getStateSnapshotByIndex(i)
                        if (stateSnapshot) {
                            stateSnapshotArr.push(stateSnapshot)
                        }
                    }

                    //debug && console.log('stateSnapshotArr length', stateSnapshotArr.length)

                    // bubble sort by timestamp
                    for (var i = 0; i < stateSnapshotArr.length - 1; i++) {
                        for (var j = 0; j < stateSnapshotArr.length - i - 1; j++) {
                            if (stateSnapshotArr[j].timestamp > stateSnapshotArr[j + 1].timestamp) {
                                var temp: any = stateSnapshotArr[j];
                                stateSnapshotArr[j] = stateSnapshotArr[j + 1];
                                stateSnapshotArr[j + 1] = temp;
                            }
                        }
                    }

                    for (var i = 0; i < stateSnapshotArr.length; i++) {
                        const stateSnapshot = {
                            timestamp: stateSnapshotArr[i].timestamp,
                            state: {
                                dist1: stateSnapshotArr[i].state.dist1 ?? null,
                                dist2: stateSnapshotArr[i].state.dist2 ?? null,
                                snr1: stateSnapshotArr[i].state.snr1 ?? null,
                                snr2: stateSnapshotArr[i].state.snr2 ?? null,
                                dist3: stateSnapshotArr[i].state.dist3 ?? null,
                                dist4: stateSnapshotArr[i].state.dist4 ?? null,
                                dist5: stateSnapshotArr[i].state.dist5 ?? null,
                                dist6: stateSnapshotArr[i].state.dist6 ?? null,
                                amp3: stateSnapshotArr[i].state.amp3 ?? null,
                                amp4: stateSnapshotArr[i].state.amp4 ?? null,
                                amp5: stateSnapshotArr[i].state.amp5 ?? null,
                                amp6: stateSnapshotArr[i].state.amp6 ?? null,
                                avg: null
                            }

                        }
                        newMergeHistory.push(stateSnapshot)

                    }

                    const mergedStateSnapshotArr = newMergeHistory.getStateSnapshotArray();
                    const mergeLastHistory = new HistoryStore()
                    for (var i = 0; i < mergedStateSnapshotArr.length; i++) {
                        const currentTimestamp = mergedStateSnapshotArr[i]?.timestamp;
                        const lastStateTimestamp = mergedStateSnapshotArr[i - 1]?.timestamp;

                        if (currentTimestamp - lastStateTimestamp < Milliseconds.SECOND * 20) {
                            mergeLastHistory.mergeLast(mergedStateSnapshotArr[i])
                        } else {
                            mergeLastHistory.push(mergedStateSnapshotArr[i])
                        }
                    }
                    const mergeLastStateSnapshotArr = mergeLastHistory.getStateSnapshotArray();
                    //debug && console.log('mergeLastHistory', mergeLastHistory)
                    // update mergedCombineHistory
                    const firstTimestamp = Math.max(mergeLastStateSnapshotArr[0].timestamp, 0);
                    const spliceIndex = Math.max(objectHistory.mergedCombineHistory.getIndexLastLessThanTimestamp(firstTimestamp), 0);
                    //debug && console.log('getIndexLastLessThanTimestamp', objectHistory.mergedCombineHistory, spliceIndex)
                    //debug && console.log('spliceIndex', spliceIndex, mergeLastStateSnapshotArr.length, objectHistory.mergedCombineHistory.getLength())


                    if (objectHistory.mergedCombineHistory.getLength() > 0) {
                        for (var index = 0; index < mergeLastStateSnapshotArr.length; index++) {
                            const keys = ['dist1', 'dist2', 'snr1', 'snr2', 'dist3', 'dist4', 'dist5', 'dist6', 'amp3', 'amp4', 'amp5', 'amp6']
                            //debug && console.log('why only one timestamp', spliceIndex + index, objectHistory.mergedCombineHistory.getLength())
                            //debug && console.log('is index increasing?', index)
                            if (spliceIndex + index < objectHistory.mergedCombineHistory.getLength()) {

                                for (var j = 0; j < keys.length; j++) {
                                    const key = keys[j]

                                    if (objectHistory.mergedCombineHistory.getStateSnapshotByIndex(spliceIndex + index).timestamp === mergeLastStateSnapshotArr[index].timestamp) {
                                        objectHistory.mergedCombineHistory[key].splice(spliceIndex + index, 1, mergeLastStateSnapshotArr[index].state[key])
                                    }

                                }
                                //debug && console.log('replace', mergeLastStateSnapshotArr[index], index, objectHistory.mergedCombineHistory)
                            } else {
                                //debug && console.log('push ss', mergeLastStateSnapshotArr[index])
                                if (objectHistory.mergedCombineHistory.lastTimestamp() !== mergeLastStateSnapshotArr[index].timestamp) {
                                    objectHistory.mergedCombineHistory.push(mergeLastStateSnapshotArr[index])
                                }

                            }

                        }

                    } else {
                        //debug && console.log('pass here', mergeLastStateSnapshotArr)
                        if (mergeLastStateSnapshotArr.length > 0) {
                            for (var k = 0; k < mergeLastStateSnapshotArr.length; k++) {
                                objectHistory.mergedCombineHistory.push(mergeLastStateSnapshotArr[k])
                            }

                        }

                    }

                    //debug && console.log('mergedCombineHistory length', objectHistory.mergedCombineHistory.getLength(), objectHistory.mergedCombineHistory)

                    const qualifyHistoryStore = new HistoryStore()

                    for (var i = 0; i < mergeLastStateSnapshotArr.length; i++) {
                        const stateSnapshot = mergeLastStateSnapshotArr[i]
                        //debug && console.log('mergeLastStateSnapshotArr stateSnapshot', stateSnapshot)
                        if (stateSnapshot.state.snr1 < silo.snr1Thres) {
                            stateSnapshot.state.dist1 = null;
                        }

                        if (stateSnapshot.state.snr2 < silo.snr2Thres) {
                            stateSnapshot.state.dist2 = null;
                        }

                        if (stateSnapshot.state.amp3 < silo.amp3Thres) {
                            stateSnapshot.state.dist3 = null;
                        }

                        if (stateSnapshot.state.amp4 < silo.amp4Thres) {
                            stateSnapshot.state.dist4 = null;
                        }

                        if (stateSnapshot.state.amp5 < silo.amp5Thres) {
                            stateSnapshot.state.dist5 = null;
                        }

                        if (stateSnapshot.state.amp6 < silo.amp6Thres) {
                            stateSnapshot.state.dist6 = null;
                        }

                        qualifyHistoryStore.push(stateSnapshot)
                    }


                    rowAveraging(qualifyHistoryStore, silo.overTh, silo.underTh)
                    //debug && console.log('pass hre', qualifyHistoryStore)
                    // update rolling history first and then perform the rolling
                    // update rollingAverageHistory
                    const rollingTimestamp = Math.max(qualifyHistoryStore.getFirstTimestamp(), 0);
                    const rollingIndex = Math.max(objectHistory.rollingAverageHistory.getIndexLastLessThanTimestamp(rollingTimestamp), 0)
                    const rowAverageStateSnapshotArr = qualifyHistoryStore.getStateSnapshotArray();

                    //debug && console.log('rowAverageStateSnapshotArr', rowAverageStateSnapshotArr.length)

                    if (objectHistory.rollingAverageHistory.getLength() > 0) {
                        for (var i = 0; i < rowAverageStateSnapshotArr.length; i++) {
                            const keys = ['dist1', 'dist2', 'dist3', 'dist4', 'dist5', 'dist6', 'avg']
                            //debug && console.log('????', rollingIndex + i)
                            if (rollingIndex + i < objectHistory.rollingAverageHistory.getLength()) {
                                for (var j = 0; j < keys.length; j++) {
                                    const key = keys[j]
                                    if (objectHistory.rollingAverageHistory.getStateSnapshotByIndex(rollingIndex + i).timestamp === rowAverageStateSnapshotArr[i].timestamp) {
                                        objectHistory.rollingAverageHistory[key].splice(rollingIndex + i, 1, rowAverageStateSnapshotArr[i].state[key])
                                    }
                                }
                            } else {
                                //debug && console.log('push into', rowAverageStateSnapshotArr[i], i)
                                if (objectHistory.rollingAverageHistory.lastTimestamp() !== rowAverageStateSnapshotArr[i].timestamp) {
                                    objectHistory.rollingAverageHistory.push(rowAverageStateSnapshotArr[i])
                                }
                            }
                        }
                    } else {
                        //debug && console.log('pass here')
                        if (rowAverageStateSnapshotArr.length > 0) {
                            //debug && console.log('rowAverageStateSnapshotArr init', rowAverageStateSnapshotArr)
                            for (var i = 0; i < rowAverageStateSnapshotArr.length; i++) {
                                objectHistory.rollingAverageHistory.push(rowAverageStateSnapshotArr[i])
                            }
                        }
                    }

                    //debug && console.log('rollingAverageHistory', objectHistory.rollingAverageHistory)
                    // slice  300 length
                    const rollingLength = objectHistory.rollingAverageHistory.getLength()
                    const sliceStart = rollingLength - 300 > 0 ? rollingLength - 300 : 0;
                    const slicedRollingAverageHistory = objectHistory.rollingAverageHistory.slice([sliceStart, rollingLength])

                    rollingAveraging(slicedRollingAverageHistory, silo.forward, silo.backward, silo.band);
                    const afterRollingStateSnapshot = slicedRollingAverageHistory.getStateSnapshotArray();



                    if (afterRollingStateSnapshot.length > 0) {
                        for (var i = 0; i < afterRollingStateSnapshot.length; i++) {
                            const keys = ['dist1', 'dist2', 'dist3', 'dist4', 'dist5', 'dist6', 'avg']

                            for (var j = 0; j < keys.length; j++) {
                                const key = keys[j];
                                objectHistory.rollingAverageHistory[key].splice(sliceStart + i, 1, afterRollingStateSnapshot[i].state[key])
                            }
                        }
                    }


                    //debug && console.log('rollingAverageHistory length', objectHistory.rollingAverageHistory)


                    // periodised history
                    const pdhs = new HistoryStore();
                    const sliceAfterRolling = afterRollingStateSnapshot.slice(-SEARCHLENGTH);

                    const fs = require('fs');
                    fs.appendFile(path.join(__dirname, 'file', 'test.txt'), JSON.stringify(afterRollingStateSnapshot) + "\n\n", (err: any) => {
                        if (err) throw err;
                    })


                    for (var i = 0; i < sliceAfterRolling.length; i++) {

                        const stateSnapshot = sliceAfterRolling[i];

                        if (stateSnapshot) {
                            const { dist1, dist2, dist3, dist4, dist5, dist6 } = stateSnapshot.state;
                            const currentTimestamp = stateSnapshot.timestamp;

                            periodiseHistory2(pdhs.getLastIndex(), pdhs, slicedRollingAverageHistory, currentTimestamp, tzOffset, dist1, dist2, dist3, dist4, dist5, dist6, silo, PERIODISELENGTH)
                        }
                    }
                    // update periodisedDistHistory
                    //debug && console.log('pdhs length', pdhs.getLength())
                    const periodiseTimestamp = Math.max(pdhs.getFirstTimestamp(), 0)
                    const periodiseIndex = Math.max(objectHistory.periodisedDistHistory.getIndexLastLessThanTimestamp(periodiseTimestamp), 0)

                    const periodiseStateSnapshot = pdhs.getStateSnapshotArray()

                    //debug && console.log('pdhs lastElement', periodiseStateSnapshot[periodiseStateSnapshot.length - 1])


                    if (periodiseStateSnapshot.length > 0) {
                        const pdhlastStateSnapshot = periodiseStateSnapshot[periodiseStateSnapshot.length - 1]

                        const secondLastSnapshot = periodiseStateSnapshot.length > 1 ? periodiseStateSnapshot[periodiseStateSnapshot.length - 2] : undefined

                        if (objectHistory.periodisedDistHistory.getLength() > 0) {

                            const pdhLastIndex = objectHistory.periodisedDistHistory.getLastIndex()
                            if (pdhlastStateSnapshot) {

                                if (pdhlastStateSnapshot.timestamp === objectHistory.periodisedDistHistory.getLastTimestamp()) {
                                    const keys = ['dist1', 'dist2', 'dist3', 'dist4', 'dist5', 'dist6', 'avg', 'volumeM3', 'percentage', 'contentHeightMtrs', 'startTimestamp', 'stopTimestamp']
                                    for (var j = 0; j < keys.length; j++) {
                                        const key = keys[j]

                                        // to avoid null shows on the detail view fill level graph
                                        if (key === 'avg') {
                                            if (pdhlastStateSnapshot.state[key]) {
                                                objectHistory.periodisedDistHistory[key][pdhLastIndex] = pdhlastStateSnapshot.state[key]
                                            } else {
                                                if (secondLastSnapshot?.state.avg) {
                                                    objectHistory.periodisedDistHistory[key][pdhLastIndex] = secondLastSnapshot.state[key]
                                                }
                                            }

                                        } else {
                                            objectHistory.periodisedDistHistory[key][pdhLastIndex] = pdhlastStateSnapshot.state[key]
                                        }

                                    }
                                } else if (pdhlastStateSnapshot.timestamp > objectHistory.periodisedDistHistory.getLastTimestamp()) {
                                    objectHistory.periodisedDistHistory.push(pdhlastStateSnapshot)
                                }
                            }
                        } else {
                            objectHistory.periodisedDistHistory.push(pdhlastStateSnapshot)
                        }

                    }


                    const pdhs4 = new HistoryStore();
                    for (var i = 0; i < sliceAfterRolling.length; i++) {
                        const stateSnapshot = sliceAfterRolling[i];

                        if (stateSnapshot) {
                            const { dist1, dist2, dist3, dist4, dist5, dist6 } = stateSnapshot.state;
                            const currentTimestamp = stateSnapshot.timestamp;

                            periodiseHistory2(pdhs4.getLastIndex(), pdhs4, slicedRollingAverageHistory, currentTimestamp, tzOffset, dist1, dist2, dist3, dist4, dist5, dist6, silo, PERIODISELENGTH4)
                        }
                    }

                    const periodiseTimestamp4 = Math.max(pdhs4.getFirstTimestamp(), 0)
                    const periodiseIndex4 = Math.max(objectHistory.periodisedDistHistoryBy4.getIndexLastLessThanTimestamp(periodiseTimestamp4), 0)


                    const periodiseStateSnapshot4 = pdhs4.getStateSnapshotArray()
                    //debug && console.log('pdhs4 lastElement', periodiseStateSnapshot4[periodiseStateSnapshot4.length - 1])

                    if (periodiseStateSnapshot4.length > 0) {
                        const pdh4lastStateSnapshot = periodiseStateSnapshot4[periodiseStateSnapshot4.length - 1]

                        const second4LastSnapshot = periodiseStateSnapshot4.length > 1 ? periodiseStateSnapshot4[periodiseStateSnapshot4.length - 2] : undefined

                        if (objectHistory.periodisedDistHistoryBy4.getLength() > 0) {

                            const pdh4LastIndex = objectHistory.periodisedDistHistoryBy4.getLastIndex()
                            if (pdh4lastStateSnapshot) {

                                if (pdh4lastStateSnapshot.timestamp === objectHistory.periodisedDistHistoryBy4.getLastTimestamp()) {
                                    const keys = ['dist1', 'dist2', 'dist3', 'dist4', 'dist5', 'dist6', 'avg', 'volumeM3', 'percentage', 'contentHeightMtrs', 'startTimestamp', 'stopTimestamp']
                                    for (var j = 0; j < keys.length; j++) {
                                        const key = keys[j]

                                        if (key === "avg") {
                                            if (pdh4lastStateSnapshot.state[key]) {
                                                objectHistory.periodisedDistHistoryBy4[key][pdh4LastIndex] = pdh4lastStateSnapshot.state[key]
                                            } else {
                                                if (second4LastSnapshot?.state.avg) {
                                                    objectHistory.periodisedDistHistoryBy4[key][pdh4LastIndex] = second4LastSnapshot.state[key]
                                                }
                                            }
                                        } else {
                                            objectHistory.periodisedDistHistoryBy4[key][pdh4LastIndex] = pdh4lastStateSnapshot.state[key]
                                        }

                                    }
                                } else if (pdh4lastStateSnapshot.timestamp > objectHistory.periodisedDistHistoryBy4.getLastTimestamp()) {
                                    objectHistory.periodisedDistHistoryBy4.push(pdh4lastStateSnapshot)
                                }
                            }
                        } else {
                            objectHistory.periodisedDistHistoryBy4.push(pdh4lastStateSnapshot)
                        }

                    }


                    var beginnumber = objectHistory.periodisedDistHistory.getLength() > ((silo?.smoothfactor ?? 1)) ? objectHistory.periodisedDistHistory.getLength() - (silo?.smoothfactor ?? 1) - 1 : 0
                    var endnmumber = objectHistory.periodisedDistHistory.getLength() > 2 ? objectHistory.periodisedDistHistory.getLength() - 1 : objectHistory.periodisedDistHistory.getLength()
                    const pdhs4smooth = objectHistory.periodisedDistHistory.slice([beginnumber, endnmumber])
                    const pdd4 = objectHistory.periodisedDistHistory;
                    const ind = pdd4.getLength() - 2;
                    const newStateSnapshot = pdd4.getStateSnapshotByIndex(ind)
                    var lastsmtm = pdhs4smooth.timestamp[pdhs4smooth.timestamp.length - 1]



                    if (lastsmtm != silo.smoothtime && pdhs4smooth.volumeM3.length != 0) {
                        silo.smoothtime = lastsmtm

                        var sumvolume = 0
                        var lastnotempty = 0
                        for (var i = 0; i < pdhs4smooth.volumeM3.length; i++) {
                            if (pdhs4smooth.volumeM3[i] != null) {
                                lastnotempty = pdhs4smooth.volumeM3[i]
                                sumvolume += pdhs4smooth.volumeM3[i]
                            } else {
                                sumvolume += lastnotempty
                            }
                        }

                        sumvolume = sumvolume / pdhs4smooth.volumeM3.length
                        silo.averagevolume = Math.round(sumvolume * 10) / 10
                        const pdhs4s = new HistoryStore();


                        const pdhsStateSnapshot = {
                            timestamp: lastsmtm,
                            state: {
                                dist1: 0,
                                dist2: 0,
                                dist3: 0,
                                dist4: 0,
                                dist5: 0,
                                dist6: 0,
                                startTimestamp: 0,
                                stopTimestamp: 0,
                                avg: 0,
                                volumeM3: silo.averagevolume,
                                percentage: silo._smoothpercentage,
                                contentHeightMtrs: 0
                            }
                        }



                        pdhs4s.push(pdhsStateSnapshot)
                        const periodiseStateSnapshot4s = pdhs4s.getStateSnapshotArray()
                        const pdh4lastStateSnapshot = periodiseStateSnapshot4s[periodiseStateSnapshot4s.length - 1]

                        objectHistory.periodisedDistHistoryBy4s.push(pdh4lastStateSnapshot)
                    }


                }

                if (objectHistory.periodisedDistHistoryBy4) {
                    const pdd4 = objectHistory.periodisedDistHistoryBy4;
                    const ind = pdd4.getLength() - 2;


                    //debug && console.log('is ind valid?', ind)
                    if (ind >= 0) {
                        const newStateSnapshot = pdd4.getStateSnapshotByIndex(ind)

                        const lastVolumeM3 = newStateSnapshot.state.volumeM3
                        const lastContentHeightMtrs = newStateSnapshot.state.contentHeightMtrs

                        //debug && console.log('is contentHeight in meters?', newStateSnapshot, lastVolumeM3, lastContentHeightMtrs)
                        //debug && console.log('branch requirement', ((new Date(currentTimestamp)).getUTCHours() + tzOffset) % 4, silo.update === 0)
                        //debug && console.log('UTC thing', currentTimestamp, (new Date(currentTimestamp)).getUTCHours(), tzOffset)

                        // update every 4 hour
                        if (((new Date(currentTimestamp)).getUTCHours() + tzOffset) % 2 === 0 && silo.update === 0) {
                            if (lastVolumeM3 && lastContentHeightMtrs) {
                                silo.lastVolumeM3 = lastVolumeM3
                                silo.contentHeightMtrs = lastContentHeightMtrs;
                                silo.lastUpdateTimestamp = currentTimestamp;

                                //debug && console.log('update every 4 hour', lastVolumeM3, lastContentHeightMtrs, currentTimestamp)

                                silo.update = 1;

                                if (silo.averagevolume) {

                                    if (silo.averagevolume <= ((silo._totalVolume ?? 0) * 0.1)) {
                                        silo.lowLevelFlag = currentTimestamp

                                    }

                                    if (silo.lowLevelFlag) {
                                        if (currentTimestamp - silo.lowLevelFlag < Milliseconds.DAY) {

                                            if (silo.averagevolume >= ((silo._totalVolume ?? 0) * 0.5)) {
                                                silo.fillLevelScore += 1

                                                if (silo.fillLevelScore >= 2) {
                                                    silo.filleventlogic = 10
                                                    silo.findfillevent = 1
                                                    silo.lastFill = currentTimestamp
                                                    silo.lowLevelFlag = 0
                                                    silo.fillLevelScore = 0
                                                    silo.totalX = currentTimestamp
                                                    silo.totalY = silo.averagevolume
                                                    silo.xsquare = (currentTimestamp * currentTimestamp)
                                                    silo.xTIMEy = (currentTimestamp * silo.averagevolume)
                                                    silo.xyCount = 1
                                                }
                                            }

                                        } else {
                                            silo.lowLevelFlag = 0
                                            silo.fillLevelScore = 0
                                        }
                                    }


                                }
                            }
                        } else if (((new Date(currentTimestamp)).getUTCHours() + tzOffset) % 2 != 0) {
                            silo.update = 0;
                        }
                    }

                    const timestamp = silo.lastUpdateTimestamp ?? 0
                    var pretime = silo.pretimestamp ?? 0

                    var outoutout = ""
                    if (pretime != timestamp && silo.averagevolume) {
                        silo.enddata = silo.averagevolume
                        silo.totalX = silo.totalX + timestamp
                        silo.totalY = silo.totalY + silo.averagevolume
                        silo.xsquare = silo.xsquare + (timestamp * timestamp)
                        silo.xTIMEy = silo.xTIMEy + (timestamp * silo.averagevolume)
                        silo.xyCount = silo.xyCount + 1

                        if (dayRollover) {

                            if ((silo.daystartvolume - silo.dayendvolume) > 0) {
                                var averageresult = Math.round((silo.daystartvolume - silo.dayendvolume) * 100) / 100
                                if (silo.dayaverageusage.length < 14) {
                                    silo.dayaverageusage.push(averageresult)
                                } else {
                                    silo.dayaverageusage.shift()
                                    silo.dayaverageusage.push(averageresult)
                                }
                            }

                            silo.daystartvolume = silo.averagevolume
                            if (silo.findfillevent === 0 && silo.enddata > silo.begindata + ((silo._totalVolume ?? 0) * 0.3) && silo.enddata > (silo.totalvolume ?? 0) * 0.3) {
                                silo.lastFill = pretime;
                                silo.totalX = timestamp
                                silo.totalY = silo.averagevolume
                                silo.xsquare = (timestamp * timestamp)
                                silo.xTIMEy = (timestamp * silo.averagevolume)
                                silo.xyCount = 1
                                silo.mindata = silo.totalvolume ?? 110
                                silo.filleventlogic = 20
                            }
                            silo.begindata = silo.averagevolume
                            silo.findfillevent = 0
                            silo.mindata = silo.totalvolume ?? 110
                        }
                        silo.dayendvolume = silo.averagevolume

                        if (silo.findfillevent === 0 && silo.averagevolume > silo.begindata + ((silo._totalVolume ?? 0) * 0.2) && silo.enddata > (silo.totalvolume ?? 0) * 0.3) {
                            silo.findfillevent = 1
                            silo.lastFill = timestamp;
                            silo.totalX = timestamp
                            silo.totalY = silo.averagevolume
                            silo.xsquare = (timestamp * timestamp)
                            silo.xTIMEy = (timestamp * silo.averagevolume)
                            silo.xyCount = 1
                            silo.mindata = silo.totalvolume ?? 110
                            silo.filleventlogic = 30
                        }

                        if (silo.mindata > silo.averagevolume) {
                            silo.mindata = silo.averagevolume
                            silo.mindatacount = 0
                        } else {
                            if (silo.findfillevent === 0 && silo.mindata + ((silo._totalVolume ?? 0) * 0.3) < silo.averagevolume && silo.enddata > (silo.totalvolume ?? 0) * 0.3) {
                                if (silo.mindatacount == 3) {
                                    silo.filleventlogic = 40
                                    silo.findfillevent = 1
                                    silo.lastFill = timestamp;
                                    silo.mindatacount = 0
                                    silo.totalX = timestamp
                                    silo.totalY = silo.averagevolume
                                    silo.xsquare = (timestamp * timestamp)
                                    silo.xTIMEy = (timestamp * silo.averagevolume)
                                    silo.mindata = silo.totalvolume ?? 110
                                    silo.xyCount = 1
                                } else {
                                    silo.mindatacount += 1
                                }
                            }
                        }

                        if (silo.averagevolume > silo.lastvolume && (silo.averagevolume > (silo.totalvolume ?? 0) * 0.3) && (silo.averagevolume > (silo.lastvolume + ((silo.totalvolume ?? 0) * 0.05)))) {
                            silo.lastvolumecount += 1

                            if (silo.lastvolumecount == 6) {
                                silo.findfillevent = 1
                                silo.filleventlogic = 50
                                silo.lastFill = currentTimestamp
                                silo.lowLevelFlag = 0
                                silo.fillLevelScore = 0
                                silo.totalX = currentTimestamp
                                silo.totalY = silo.averagevolume
                                silo.xsquare = (currentTimestamp * currentTimestamp)
                                silo.xTIMEy = (currentTimestamp * silo.averagevolume)
                                silo.xyCount = 1
                                silo.lastvolumecount = 0
                            }
                        } else if (silo.averagevolume < silo.lastvolume) {
                            silo.lastvolumecount -= 3
                            if (silo.lastvolumecount < 0) {
                                silo.lastvolumecount = 0
                            }
                        } else {
                            silo.lastvolumecount -= 1
                            if (silo.lastvolumecount < 0) {
                                silo.lastvolumecount = 0
                            }
                        }

                        // var outout1 = new Date(currentTimestamp) + "\n"
                        // outout1 += silo.lastvolume + " | | " + silo.averagevolume + "\n"
                        // outout1 += silo.lastvolumecount + "\n"
                        // outout1 += new Date(silo.lastFill ?? 0)
                        // const fs = require('fs');
                        // fs.appendFile(path.join(__dirname, 'file', 'test.txt'), new Date(silo.lastFill ?? 0) + "\n\n", (err: any) => {
                        //     if (err) throw err;
                        // })

                        silo.lastvolume = silo.averagevolume

                        if (silo.xyCount == 0) {
                            silo.daysToEmpty = -430;
                        } else {
                            silo.averageX = silo.totalX / silo.xyCount
                            silo.averageY = silo.totalY / silo.xyCount
                            silo.bup = silo.xTIMEy - (silo.xyCount * silo.averageX * silo.averageY)
                            silo.bdown = silo.xsquare - (silo.xyCount * silo.averageX * silo.averageX)
                            var runresult = timestamp

                            if (silo.bdown == 0) {
                                silo.daysToEmpty = -430;
                            } else {
                                silo.bresult = silo.bup / silo.bdown
                                silo.aresult = silo.averageY - (silo.bresult * silo.averageX)

                                runresult = (0 - silo.aresult) / silo.bresult
                                runresult = Math.round(runresult)
                                silo.daysToEmpty = Math.round((runresult - timestamp) / Milliseconds.DAY);

                                if (silo.bresult * 10000000000 == 0) {
                                    silo.daysToEmpty = -431;

                                    silo.totalX = timestamp
                                    silo.totalY = silo.averagevolume
                                    silo.xsquare = (timestamp * timestamp)
                                    silo.xTIMEy = (timestamp * silo.averagevolume)
                                    silo.xyCount = 1
                                } else if (silo.bresult * 10000000000 > 0) {
                                    silo.daysToEmpty = -432;

                                    silo.totalX = timestamp
                                    silo.totalY = silo.averagevolume
                                    silo.xsquare = (timestamp * timestamp)
                                    silo.xTIMEy = (timestamp * silo.averagevolume)
                                    silo.xyCount = 1
                                }
                            }
                        }
                    }
                    silo.pretimestamp = timestamp
                    console.log('check333', silo.daysToEmpty);
                }

                //debug && console.log('testwork2', silo.lastVolumeM3);




                if (dayRollover) {
                    const upcomingSchedules = silo.getVolumePredictionTimeline(currentTimestamp, currentTimestamp + calulatedStateParams.daysToEmptyPrediction.sheduleWindow)
                    //debug && console.log('currentTimestamp', currentTimestamp)

                    //debug && console.log('upcomingSchedules', upcomingSchedules)

                    const predictedEmptyViaSchedules = upcomingSchedules.find((x) => x.totalVolumeM3 < 0)

                    //debug && console.log('predictedEmptyViaSchedules', predictedEmptyViaSchedules)
                    const predictedDaysToEmptyViaSchedules = predictedEmptyViaSchedules ? Math.ceil((predictedEmptyViaSchedules.timeMs - currentTimestamp) / Milliseconds.DAY) : undefined

                    //debug && console.log('predictedDaysToEmptyViaSchedules', predictedDaysToEmptyViaSchedules)


                    if (objectHistory.dailyStateHistory) {
                        const dsh = objectHistory.dailyStateHistory
                        const lastVolumeM3 = dsh.peekLast(v016ObjectHistoryKeys.dailyStateHistory.volumeM3)

                        //debug && console.log('lastVolumeM3', lastVolumeM3);
                        const dayDate = new Date(currentTimestamp)
                        const tzOffsetHrs = silo.tz ? getTZOffsetHours(silo.tz, dayDate) : tzOffset
                        //const HVP: CalculateSiloHVPResult = silo.calculateHVP((siloTotalInternalHeightMM - silo.cntHForDaily * 1000))
                        const pdd = objectHistory.periodisedDistHistory;
                        const lastAvgDist = pdd.peekLast(v016ObjectHistoryKeys.periodisedDistHistory.avg)
                        const HVP: CalculateSiloHVPResult = silo.calculateHVP((lastAvgDist))

                        const vM3delta = typeof lastVolumeM3 === 'number' ? lastVolumeM3 - (HVP.volumeM3 ?? 0) : null

                        const aveDailyUsageM3 = mean(dsh.peekLastN(calulatedStateParams.daysToEmptyPrediction.numberOfDaysForAverage, v016ObjectHistoryKeys.dailyStateHistory.volumeM3UsedDay) ?? [])
                        //debug && console.log('volumeM3UsedDay', calulatedStateParams.daysToEmptyPrediction.numberOfDaysForAverage, dsh[v016ObjectHistoryKeys.dailyStateHistory.volumeM3UsedDay])
                        //debug && console.log('aveDailyUsageM3', aveDailyUsageM3, dsh.peekLastN(calulatedStateParams.daysToEmptyPrediction.numberOfDaysForAverage, v016ObjectHistoryKeys.dailyStateHistory.volumeM3UsedDay))


                        const volumeM3UsedYesterday: number | null = vM3delta && vM3delta > 0 ? roundDecimals(vM3delta, 2) : null

                        const volumeM3UsedForDaysToEmpty = volumeM3UsedYesterday ?? aveDailyUsageM3

                        const totalVolumeUsedForDaysToEmpty = HVP.volumeM3 ?? lastVolumeM3;
                        const daysToEmptyFromVolumeUsed = volumeM3UsedForDaysToEmpty ? Math.floor(totalVolumeUsedForDaysToEmpty / volumeM3UsedForDaysToEmpty) : null;

                        const daysToEmpty = predictedDaysToEmptyViaSchedules ?? daysToEmptyFromVolumeUsed;
                        //debug && console.log("daysToEmpty", daysToEmptyFromVolumeUsed, totalVolumeUsedForDaysToEmpty, volumeM3UsedForDaysToEmpty)


                        // silo.daysToEmpty = daysToEmpty;

                        silo.volumeM3UsedDay = volumeM3UsedYesterday ?? (aveDailyUsageM3 ?? null)

                        dayDate.setHours(-tzOffsetHrs, 0, 0, 0)
                        const timestamp = dayDate.valueOf()

                        // fillEvent
                        let volumeDifference = 0;


                        const bfhLastIdx = dsh.getLastIndex();
                        //debug && console.log('bfhLastIdx', bfhLastIdx);

                        const daySnapshot: TypedStateSnapshot<CalculateSiloHVPResult & { volumeM3UsedDay: number | null, daysToEmpty: number | null, fillEvent: number, fillEventT: number }> = {
                            timestamp, state: {
                                ...HVP,
                                // volumeM3UsedDay: volumeM3UsedYesterday ?? (aveDailyUsageM3 ?? null),
                                volumeM3UsedDay: silo.volumeM3UsedDay,
                                // daysToEmpty: (silo.bfVolM3 as number) / silo.volumeM3UsedDay,
                                daysToEmpty: silo.daysToEmpty,
                                fillEvent: volumeDifference,
                                fillEventT: silo.convertM3ToTonne(volumeDifference),

                            }
                        }
                        dsh?.push(daySnapshot)

                    }
                } else {
                    // debug && false && console.log('Not day rollover', { then: new Date(lastRecentStateTimestamp).toLocaleString('en-NZ'), now: new Date(currentTimestamp).toLocaleString('en-NZ') })
                }




            } else {
                // debug &&  console.log('NOT PROCESSING as powerbinDistanceRes.status', powerbinDistanceRes?.status)
            }
        } else {
            console.log('No OBJECT HISTORY!')
        }

        objectHistory.filteredHistoryStore.systemProperties = {
            autoTrim: false
        }

        objectHistory.fillConsumeHistoryStore.systemProperties = {
            autoTrim: false
        }

        objectHistory.diagnosticHistoryStore.systemProperties = {
            autoTrim: false
        }

        objectHistory.bestFitHistoryStore.systemProperties = {
            autoTrim: false
        }

        objectHistory.threeHourStateHistory.systemProperties = {
            autoTrim: false
        }

        objectHistory.calculationStateHistory.systemProperties = {
            autoTrim: false
        }

        objectHistory.pbReadingStateHistory.systemProperties = {
            autoTrim: false
        }

        objectHistory.rollingAverageHistory.systemProperties = {
            autoTrim: false
        }

        objectHistory.mergedCombineHistory.systemProperties = {
            autoTrim: false
        }

        objectHistory.periodisedDistHistory.systemProperties = {
            autoTrim: false
        }

        objectHistory.payloadsHistory.systemProperties = {
            autoTrim: false
        }

        objectHistory.periodisedDistHistoryBy4.systemProperties = {
            autoTrim: false
        }


        result.data.calculatedState = calculatedShadowAtts;

        console.log(result);
    } catch (error) {
        console.log(error);
    }

    return result;

}
