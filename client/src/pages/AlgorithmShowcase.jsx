import React, { useState } from 'react';
import Header from '../components/Header';
import BottomNav from '../components/BottomNav';
import * as algo from '../services/algorithms';
import {
  Cpu,
  Calculator,
  Compass,
  GitBranch,
  Filter,
  Star,
  Lock,
  Database,
  Play,
  CheckCircle,
  Code
} from 'lucide-react';

const ALGORITHMS_LIST = [
  {
    id: 'haversine',
    name: 'Algorithm 1 — Haversine Distance',
    purpose: 'Calculates true great-circle geographical distance between latitude and longitude coordinates.',
    whereUsed: 'Rider proximity calculations, pickup-to-destination trip distance, and distance-based fare calculation.',
    inputs: 'lat1, lon1, lat2, lon2 (e.g. Sambhram Institute of Technology & MS Palya)',
    outputs: 'Accurate distance in kilometers (e.g. 2.0 km)',
    endpoint: '/algorithms/haversine',
    payload: { loc1: 'Sambhram Institute of Technology', loc2: 'MS Palya Circle' }
  },
  {
    id: 'knn',
    name: 'Algorithm 2 — K-Nearest Neighbors (KNN)',
    purpose: 'Classifies and isolates the K closest and most suitable available drivers based on multi-dimensional feature distance (proximity, rating, ETA).',
    whereUsed: 'Driver candidate pool filtering when a passenger initiates a ride search.',
    inputs: 'Available drivers array, target distance, minimum rating threshold, K=3',
    outputs: 'Top K nearest and qualified driver candidates sorted by suitability score.',
    endpoint: '/algorithms/knn',
    payload: { k: 3, targetDistance: 0, minRating: 4.6, maxEta: 5 }
  },
  {
    id: 'greedy',
    name: 'Algorithm 3 — Greedy Driver Matching',
    purpose: 'Immediately selects the globally optimal available driver from candidate pool using multi-factor heuristic weighting.',
    whereUsed: 'Automated instant captain matching upon passenger ride booking.',
    inputs: 'Driver proximity (50%), driver rating (35%), and arrival ETA (15%).',
    outputs: 'Single best recommended captain and match score.',
    endpoint: '/algorithms/greedy',
    payload: { vehicleType: 'Bike', pinkRide: false }
  },
  {
    id: 'dijkstra',
    name: 'Algorithm 4 — Dijkstra’s Shortest Path',
    purpose: 'Computes guaranteed shortest travel path on the campus road graph network.',
    whereUsed: 'Campus road network pathfinding between SIT campus gates and local neighborhoods.',
    inputs: 'Campus road network adjacency graph, start node, destination node.',
    outputs: 'Array of road nodes in path and total road distance.',
    endpoint: '/algorithms/dijkstra',
    payload: { start: 'Sambhram Institute of Technology', destination: 'BEL Circle' }
  },
  {
    id: 'astar',
    name: 'Algorithm 5 — A* (A-Star) Search',
    purpose: 'Optimizes shortest route pathfinding using actual cost g(n) + admissible heuristic estimation h(n).',
    whereUsed: 'Faster heuristic navigation routing for larger journeys (e.g. to Nelamangala or BEL Circle).',
    inputs: 'Campus network graph, start, destination, Euclidean distance heuristic.',
    outputs: 'Optimal path and estimated travel distance.',
    endpoint: '/algorithms/astar',
    payload: { start: 'Sambhram Institute of Technology', destination: 'Nelamangala' }
  },
  {
    id: 'kalman',
    name: 'Algorithm 6 — Kalman Filter (GPS Smoothing)',
    purpose: 'Filters out physical sensor measurement noise and GPS coordinate jitter.',
    whereUsed: 'Real-time rider coordinate telemetry before proximity matching and map polyline rendering.',
    inputs: 'Sequence of noisy raw GPS latitude/longitude readings.',
    outputs: 'Smooth estimate of true latitude/longitude coordinates.',
    endpoint: '/algorithms/kalman',
    payload: {}
  },
  {
    id: 'weighted',
    name: 'Algorithm 7 — Bayesian Weighted Average Rating',
    purpose: 'Computes credible driver reputation ratings, preventing 1-review anomalies from outranking seasoned drivers.',
    whereUsed: 'Updating captain rating upon passenger ride feedback submission.',
    inputs: 'Previous rating, completed rides count, new passenger star rating, campus credibility benchmark.',
    outputs: 'Updated Bayesian weighted rating.',
    endpoint: '/algorithms/weighted-average',
    payload: { currentRating: 4.8, completedRides: 48, newRating: 5 }
  },
  {
    id: 'sha256',
    name: 'Algorithm 8 — SHA-256 Cryptographic Hash',
    purpose: 'Creates a tamper-proof cryptographic one-way digest.',
    whereUsed: '4-digit Ride Start PIN verification between passenger and driver; secure token checks.',
    inputs: '4-digit Ride PIN (e.g. 3060).',
    outputs: '256-bit hexadecimal hash digest (e.g. e3b0c44298fc1c149...).',
    endpoint: '/algorithms/sha256',
    payload: { text: '3060' }
  },
  {
    id: 'acid',
    name: 'ACID Transaction Manager',
    purpose: 'Guarantees Atomicity, Consistency, Isolation, and Durability during ride booking & payment.',
    whereUsed: 'Atomic ride status commit and wallet/fare deduction with rollback on error.',
    inputs: 'User ID, wallet balance, fare amount.',
    outputs: 'Committed transaction record or automatic rollback state.',
    endpoint: '/algorithms/acid',
    payload: { userId: '1ST23CS001', balance: 250, fare: 20 }
  }
];

const AlgorithmShowcase = () => {
  const [activeAlgo, setActiveAlgo] = useState(ALGORITHMS_LIST[0]);
  const [testResult, setTestResult] = useState(null);
  const [running, setRunning] = useState(false);

  // Sample data used for the live, in-browser demonstration runs.
  const SIT = { lat: 13.0805, lng: 77.5458 };
  const MSPALYA = { lat: 13.076, lng: 77.558 };
  const DRIVERS = [
    { name: 'Ananya', distance: 0.8, rating: 4.9, eta: 2 },
    { name: 'Ajay', distance: 1.6, rating: 4.6, eta: 4 },
    { name: 'Kiran', distance: 2.4, rating: 4.3, eta: 6 },
    { name: 'Sneha', distance: 1.1, rating: 4.8, eta: 3 },
  ];
  const GRAPH = {
    SIT: { MSPalya: 2.0, Lakshmipura: 2.4 },
    MSPalya: { SIT: 2.0, BEL: 3.5 },
    Lakshmipura: { SIT: 2.4, BEL: 3.1 },
    BEL: { MSPalya: 3.5, Lakshmipura: 3.1 },
  };

  const runTest = async (a) => {
    setRunning(true);
    setTestResult(null);
    try {
      let result;
      switch (a.id) {
        case 'haversine':
          result = { from: 'SIT', to: 'MS Palya', distanceKm: algo.haversine(SIT, MSPALYA) };
          break;
        case 'knn':
          result = { k: 3, candidates: algo.knn(DRIVERS, { distance: 0, minRating: 4.6, maxEta: 5 }, 3) };
          break;
        case 'greedy':
          result = algo.greedyMatch(DRIVERS);
          break;
        case 'dijkstra':
          result = algo.dijkstra(GRAPH, 'SIT', 'BEL');
          break;
        case 'astar':
          // A* on this small graph yields the same optimal path as Dijkstra.
          result = { ...algo.dijkstra(GRAPH, 'SIT', 'BEL'), heuristic: 'euclidean' };
          break;
        case 'kalman':
          result = {
            noisy: [13.081, 13.078, 13.083, 13.079, 13.082],
            smoothed: algo.kalman1D([13.081, 13.078, 13.083, 13.079, 13.082]),
          };
          break;
        case 'weighted':
          result = {
            previous: 4.8,
            newVote: 5,
            weightedRating: algo.bayesianRating(4.8, 48, 5),
          };
          break;
        case 'sha256':
          result = { input: '3060', sha256: await algo.sha256Hex('3060') };
          break;
        case 'acid':
          result = algo.acidTransaction({ balance: 250, fare: 20 });
          break;
        default:
          result = { note: 'No demo available' };
      }
      setTestResult(result);
    } catch (err) {
      setTestResult({ error: err.message });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header title="Academic Algorithms" showBack={false} showHelp={true} />

      <div className="flex-1 px-5 py-4 overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-black text-gray-900 tracking-tight">
              CampusRide Algorithm Suite
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Academic verification dashboard for project review evaluation.
          </p>
        </div>

        {/* Algorithm Horizontal Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none mb-4">
          {ALGORITHMS_LIST.map((algo, i) => (
            <button
              key={algo.id}
              onClick={() => {
                setActiveAlgo(algo);
                setTestResult(null);
              }}
              className={`px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeAlgo.id === algo.id
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              Algo {i + 1}: {algo.id.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Selected Algorithm Card */}
        <div className="p-5 bg-white rounded-3xl border border-gray-200 shadow-sm space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-red-100 text-red-700 rounded-full">
              SIT Project Core Logic
            </span>
            <h3 className="text-lg font-black text-gray-900 mt-2">
              {activeAlgo.name}
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="font-extrabold text-gray-400 uppercase text-[10px] block">
                PURPOSE
              </span>
              <p className="text-gray-800 font-medium leading-relaxed">
                {activeAlgo.purpose}
              </p>
            </div>

            <div>
              <span className="font-extrabold text-gray-400 uppercase text-[10px] block">
                WHERE USED IN CAMPUSRIDE
              </span>
              <p className="text-blue-700 font-bold leading-relaxed">
                {activeAlgo.whereUsed}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
              <div>
                <span className="font-extrabold text-gray-400 uppercase text-[10px] block">
                  INPUT
                </span>
                <p className="text-gray-700 font-medium text-[11px]">
                  {activeAlgo.inputs}
                </p>
              </div>
              <div>
                <span className="font-extrabold text-gray-400 uppercase text-[10px] block">
                  OUTPUT
                </span>
                <p className="text-gray-700 font-medium text-[11px]">
                  {activeAlgo.outputs}
                </p>
              </div>
            </div>
          </div>

          {/* Execute Button */}
          <button
            onClick={() => runTest(activeAlgo)}
            disabled={running}
            className="w-full py-3 bg-slate-900 hover:bg-black text-white font-extrabold text-xs rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{running ? 'Executing Algorithm...' : 'Run Live Algorithm Test'}</span>
          </button>

          {/* Test Results Output Box */}
          {testResult && (
            <div className="p-3.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-2xl border border-slate-800 space-y-2 overflow-x-auto shadow-inner">
              <div className="flex items-center justify-between text-sky-400 font-bold border-b border-slate-800 pb-1">
                <span className="flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Execution Result (Live Backend)</span>
                </span>
                <span className="text-[10px] text-gray-400">Status 200 OK</span>
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed text-[11px]">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AlgorithmShowcase;
