import { SetStateAction, Dispatch } from 'react';

export interface ImageViewerI {
  images?: string[],
  index?: number,
  setShowImageViewer?: Dispatch<SetStateAction<boolean>>,
  controlsOutside?: boolean,
}

export interface operationI {
  [key: string] : (a: number, b: number) => number,
}

export interface comparisonI {
  [key: string] : (a: number, b: number) => boolean,
}

export interface currentZoomI {
  val: number,
  mORd: string,
  aORs: string,
  lORm: string,
  dF: number
}