import { useEffect, useRef, useState } from 'react'

/** 컨테이너 실제 폭을 재서 SVG를 그린다 — viewBox 늘리기로 글자가 찌그러지지 않게. */
export function useMeasure<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width)
    })
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  return { ref, width }
}
