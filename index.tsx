import { ReactElement, useEffect, useState, useRef, ReactNode, MouseEvent, TouchEvent } from 'react';
import css from './ImageViewerCSS.module.css';
import { Forward, Add, Remove, Close } from '@mui/icons-material/';
import { Button } from '@mui/material';
import { ImageViewerI, operationI, comparisonI, currentZoomI } from './interfaces';

function ImageViewer({ images, index, setShowImageViewer, controlsOutside }: ImageViewerI): ReactElement {

  let clickOnBG = useRef({ // CLICK ON BACKGROUND MODAL
    start: false, // CLICK BEGINS ON BG MODAL
    end: false    // CLICK ENDS ON BG MODAL
  })

  useEffect(() => { // DISABLES MOUSE (DESKTOP) EVENT WHEN MOUSE DRAG LEAVE CANVAS
    let canvas = document.getElementById('canvasImage')
    if (canvas !== null) canvas.onmouseout = function() { allowMove.current = false }
  }, [])

  window.onmousedown = function(e) {
    let modalDiv = document.getElementById('modalBackground');
    if (e.target === modalDiv) clickOnBG.current.start =  true
    else clickOnBG.current.start =  false
  }

  window.onmouseup = function(e) {
    let modalDiv = document.getElementById('modalBackground');
    if (e.target === modalDiv) clickOnBG.current.end =  true
    else clickOnBG.current.end =  false
    if (setShowImageViewer !== undefined && clickOnBG.current.start && clickOnBG.current.end) setShowImageViewer(false)
  }

  const [ currentIndex, setCurrentIndex ] = useState<number>(index !== undefined ? index : 0)

  // mORd = multiplication OR division
  // aORs = addition OR subtraction
  // lORm = less OR more
  // dF = dimensionFactor
  const [ currentZoom, setCurrentZoom ] = useState<currentZoomI>({ // (cZ)
    val: 1, mORd: 'x', aORs: '+', lORm: '<=', dF: 2
  })

  let refCanvas = useRef<HTMLCanvasElement>(null)
  let image = useRef(new Image())
  let allowMove = useRef(false)
  let arbPos = useRef({ x: 0, y: 0 }) // ARBITRARY POSITION
  let initImgPos = useRef({ x: 0, y: 0 }) // INITIAL IMAGE POSITION
  let imgPo = useRef({ x: 0, y: 0 }) // IMAGE POSITION

  useEffect(() => { // LOAD NEW IMAGE
    if (images !== undefined && currentIndex !== undefined) {
      image.current.src = images[currentIndex]
      image.current.onload = function() {
        if (refCanvas.current !== null) { //
          let ref = refCanvas.current
          let ctx = ref.getContext("2d");
          ref.width = image.current.naturalWidth
          ref.height = image.current.naturalHeight

          // e.g.:               x: -480            y: -260               // (1920 x 1040)
          // WHEN 1.0 TO 1.5, SET POSITION TO CENTER OF IMAGE
          initImgPos.current = { x: ref.width / -4, y: ref.height / -4 }

          imgPo.current = { x: 0, y: 0 }

          if (ctx !== null) {
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(
              image.current,
              0, 0,
              ref.width, ref.height
            ); // FIRST IMAGE DRAW
          }
        }
      }
    }
  }, [currentIndex, images])

  useEffect(() => { // ZOOM CHANGED
    const operation: operationI = {
      'x': function(a: number, b: number) { return a * b },
      '/': function(a: number, b: number) { return a / b },
      '+': function(a: number, b: number) { return a + b },
      '-': function(a: number, b: number) { return a - b }
    }

    const comparison: comparisonI = {
      '<=': function(a: number, b: number) { return a <= b },
      '>=': function(a: number, b: number) { return a >= b }
    }

    if (refCanvas.current !== null) {
      let ref = refCanvas.current
      let ctx = ref.getContext("2d");

      if (ctx !== null) {
        let targetZoom = currentZoom.mORd === 'x' ? currentZoom.val - 0.5 : currentZoom.val
        let divider = targetZoom + (targetZoom - 2) // dvdr //   0,   1,   2,   3,   4..
        let factor =                                // fctr // 1/2, 1/3, 1/4, 1/5, 1/6..
          divider === 0 ? 1 :
          1 + (1 / divider)

        // *** // LESS -> MORE // MORE -> LESS //
        // cZ  // dvdr // fctr // dvdr // fctr //
        // 1.0 // -1   // 0    // 0    // 1    //
        // 1.5 //  0   // 1    // 1    // 2    //
        // 2.0 //  1   // 2    // 2    // 1.5  //
        // 2.5 //  2   // 1.5  // 3    // 1.33 //
        // 3.0 //  3   // 1.33 // 4    // 1.25 //

        let halfDim = { w: ref.width / 2, h: ref.height / 2 }
        let basePos = { x: imgPo.current.x, y: imgPo.current.y }
        let baseDim = { w: halfDim.w * (divider + currentZoom.dF), h: halfDim.h * (divider + currentZoom.dF) };
        //         'x' --> halfDim.w * (divider + 2)
        //         '/' --> halfDim.w * (divider + 3)

        currentZoom.val === 1 ? imgPo.current = { x: 0, y: 0 } : // WHEN 1.0 SET POSITION TO 0, 0
        currentZoom.val === 1.5 && currentZoom.mORd === 'x' ? imgPo.current = { x: initImgPos.current.x, y: initImgPos.current.y } : // WHEN 1.0 TO 1.5, SET POSITION TO CENTER OF IMAGE
        imgPo.current = { x: operation[currentZoom.mORd](imgPo.current.x, factor), y: operation[currentZoom.mORd](imgPo.current.y, factor) } // ELSE DO TARGET CALC

        let targetPosition = { x: imgPo.current.x, y: imgPo.current.y } // TARGET (UPDATED ↑↑↑) POSITION

        let offset = 10 // ANIMATION FRAMES BETWEEN X.0 --> X.5
        let eachFramePos = { x: (targetPosition.x - basePos.x) / offset, y: (targetPosition.y - basePos.y) / offset } // EACH FRAME POS TO INCREASE/DECREASE
        let eachFrameDim = { w: halfDim.w / offset, h: halfDim.h / offset } // EACH FRAME WIDTH TO INCREASE/DECREASE // (1920 / 2) / offset

        let currPos = { x: basePos.x, y: basePos.y }
        let currentDim = { w: baseDim.w, h: baseDim.h }

        let targetWidth = ref.width * currentZoom.val

        let render = () => {
          if (ctx !== null) {
            ctx.drawImage(
              image.current,
              currPos.x, currPos.y,
              currentDim.w, currentDim.h
            );
            currPos = { x: currPos.x + eachFramePos.x, y: currPos.y + eachFramePos.y }
            currentDim.w = operation[currentZoom.aORs](currentDim.w, eachFrameDim.w)
            currentDim.h = operation[currentZoom.aORs](currentDim.h, eachFrameDim.h)
          }
          if (comparison[currentZoom.lORm](currentDim.w, targetWidth)) requestAnimationFrame(render);
        }
        if (((currentZoom.val !== 1 && currentZoom.mORd === 'x') || currentZoom.mORd === '/')) render()
      }
    }
  }, [currentZoom])

  let mouseDown = (e: TouchEvent | MouseEvent) => {
    if ('touches' in e) { // TOUCH EVENT
      arbPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      allowMove.current = true
    } else { // MOUSE EVENT
      arbPos.current = { x: e.clientX, y: e.clientY }
      allowMove.current = true
    }
  }

  let mouseUp = (e: TouchEvent | MouseEvent) => {
    allowMove.current = false
  }

  let mouseMove = (e: TouchEvent | MouseEvent) => {
    if (allowMove.current && currentZoom.val !== 1) {
      if (refCanvas.current !== null) {
        let ref = refCanvas.current
        let ctx = ref.getContext("2d");
        if (ctx !== null) {
          let targetXPosition;
          let targetYPosition;

          if ('touches' in e) { // TOUCH EVENT
            targetXPosition = imgPo.current.x + (e.touches[0].clientX - arbPos.current.x) * 3 // '* 3' = INCREASE SPEED HERE FOR MOBILE
            targetYPosition = imgPo.current.y + (e.touches[0].clientY - arbPos.current.y) * 3 // '* 3' = INCREASE SPEED HERE FOR MOBILE
          } else { // MOUSE EVENT
            targetXPosition = imgPo.current.x + (e.clientX - arbPos.current.x) * 1 // '* 1' = INCREASE SPEED HERE FOR DESKTOP
            targetYPosition = imgPo.current.y + (e.clientY - arbPos.current.y) * 1 // '* 1' = INCREASE SPEED HERE FOR DESKTOP
          }

          let factor = ((currentZoom.val * 2) - 2) * 2
          //   cZ                factor
          // ((1.5 * 2) - 2) * 2 = 2
          // ((2.0 * 2) - 2) * 2 = 4
          // ((2.5 * 2) - 2) * 2 = 6
          // ((3.0 * 2) - 2) * 2 = 8

          if (
            (targetXPosition < 0 && targetXPosition > initImgPos.current.x * factor) &&
            (targetYPosition < 0 && targetYPosition > initImgPos.current.y * factor)
          ) {
            ctx.drawImage(
              image.current,
              targetXPosition, targetYPosition,
              ref.width * currentZoom.val, ref.height * currentZoom.val
            );
            imgPo.current = { x: targetXPosition, y: targetYPosition }
          }
        }
      }
      if ('touches' in e) arbPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      else arbPos.current = { x: e.clientX, y: e.clientY }
    }
  }

  const zoomIn = () => setCurrentZoom((curr: currentZoomI) => ({ val: curr.val + 0.5, mORd: 'x', aORs: '+', lORm: '<=', dF: 2 }))

  const zoomOut = () => setCurrentZoom((curr: currentZoomI) => ({ val: curr.val - 0.5, mORd: '/', aORs: '-', lORm: '>=', dF: 3 }))

  const goLeftHandler = () => {
    if (images !== undefined) {
      if (currentIndex === 0) setCurrentIndex(images.length - 1)
      else setCurrentIndex((curr: number) => curr - 1)
      setCurrentZoom({ val: 1, mORd: 'x', aORs: '+', lORm: '<=', dF: 2 })
    }
  }

  const goRightHandler = () => {
    if (images !== undefined) {
      if (currentIndex === images.length - 1) setCurrentIndex(0)
      else setCurrentIndex((curr: number) => curr + 1)
      setCurrentZoom({ val: 1, mORd: 'x', aORs: '+', lORm: '<=', dF: 2 })
    }
  }

  const controls: ReactNode =
    <div
      id={`bottomBar`}
      className={css.bottomBar}
    >
      <div className={css.buttonsContainer}>
        <div className={css.imageCounter}>
          { currentIndex !== undefined && images !== undefined ? currentIndex + 1 : 0 }/{ currentIndex !== undefined && images !== undefined ? images.length : 0 }
        </div>
        <Button
          variant="contained"
          className={css.button}
          onClick={() => goLeftHandler()}
        >
          <Forward className={css.icon}/>
        </Button>

        <Button
          variant="contained"
          className={css.button}
          onClick={() => goRightHandler()}
        >
          <Forward className={`${css.icon} ${css.right}`}/>
        </Button>

        <Button
          variant="contained"
          className={css.button}
          onClick={() => zoomOut()}
          disabled={ currentZoom.val === 1 ? true : false }
        >
          <Remove className={`${css.icon} ${css.right}`}/>
        </Button>

        <Button
          variant="contained"
          className={css.button}
          onClick={() => zoomIn()}
          disabled={ currentZoom.val === 8 ? true : false }
        >
          <Add className={`${css.icon} ${css.right}`}/>
        </Button>

        <Button
          variant="contained"
          className={css.button}
          onClick={() => { if (setShowImageViewer !== undefined) setShowImageViewer(false)} }
        >
          <Close className={`${css.icon} ${css.right}`}/>
        </Button>
        <div className={css.zoomContainer}>
          { currentZoom.val.toFixed(1) }x
        </div>
      </div>
    </div>

  return (
    <div
      id={`modalBackground`}
      className={css.modalBackground}
    >
      <div
        id={`innerModal`}
        className={css.innerModal}
      >
        <canvas
          id={`canvasImage`}
          ref={refCanvas}
          className={css.canvasImage}
          onTouchStart={(e) => mouseDown(e)} // TOUCH START
          onMouseDown={(e) => mouseDown(e)} // MOUSE START
          onTouchEnd={(e) => mouseUp(e)} // TOUCH END
          onMouseUp={(e) => mouseUp(e)} // MOUSE END
          onTouchMove={(e) => mouseMove(e)} // TOUCH MOVE
          onMouseMove={(e) => mouseMove(e)} // MOUSE MOVE
        />
        { !controlsOutside && controls }
      </div>
      { controlsOutside && controls }
    </div>
  )
}

export default ImageViewer;