/* Link / NavLink / useGo có sẵn hiệu ứng chuyển trang (View Transitions API, tự bỏ qua nếu trình duyệt không hỗ trợ). */
import { forwardRef, useCallback } from 'react'
import { Link as RouterLink, NavLink as RouterNavLink, useNavigate, type LinkProps, type NavLinkProps, type To } from 'react-router-dom'
import { isPlainClick, transitionTo } from './hooks'

type GoOptions = { replace?: boolean; state?: unknown }

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ to, replace, state, target, reloadDocument, onClick, ...rest }, ref) {
  const navigate = useNavigate()
  return (
    <RouterLink ref={ref} to={to} replace={replace} state={state} target={target} reloadDocument={reloadDocument} {...rest}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || reloadDocument || (target && target !== '_self') || !isPlainClick(e)) return
        e.preventDefault()
        transitionTo(() => navigate(to, { replace, state }))
      }} />
  )
})

export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(function NavLink({ to, replace, state, target, reloadDocument, onClick, ...rest }, ref) {
  const navigate = useNavigate()
  return (
    <RouterNavLink ref={ref} to={to} replace={replace} state={state} target={target} reloadDocument={reloadDocument} {...rest}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || reloadDocument || (target && target !== '_self') || !isPlainClick(e)) return
        e.preventDefault()
        transitionTo(() => navigate(to, { replace, state }))
      }} />
  )
})

/** Thay cho useNavigate khi muốn chuyển trang bằng code (sau khi đặt hàng, tìm kiếm...) mà vẫn có hiệu ứng. */
export function useGo() {
  const navigate = useNavigate()
  return useCallback((to: To, opts?: GoOptions) => transitionTo(() => navigate(to, opts)), [navigate])
}
