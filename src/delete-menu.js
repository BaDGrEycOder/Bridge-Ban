const MENU_CLASS = 'action-dropdown'
let activeMenu = null
let bypassButton = null

function closeMenu() {
  activeMenu?.remove()
  activeMenu = null
}

function openMenu(button) {
  if (activeMenu?.dataset.forButton === 'true') closeMenu()
  const rect = button.getBoundingClientRect()
  const menu = document.createElement('div')
  menu.className = MENU_CLASS
  menu.setAttribute('role', 'menu')
  menu.dataset.forButton = 'true'
  menu.style.top = `${Math.min(rect.bottom + 5, window.innerHeight - 54)}px`
  menu.style.left = `${Math.min(Math.max(8, rect.right - 144), window.innerWidth - 152)}px`

  const deleteAction = document.createElement('button')
  deleteAction.type = 'button'
  deleteAction.setAttribute('role', 'menuitem')
  deleteAction.innerHTML = '<span aria-hidden="true">⌫</span> Delete'
  deleteAction.addEventListener('click', () => {
    closeMenu()
    bypassButton = button
    button.click()
    queueMicrotask(() => { bypassButton = null })
  })
  menu.append(deleteAction)
  document.body.append(menu)
  activeMenu = menu
}

document.addEventListener('click', event => {
  if (activeMenu?.contains(event.target)) return
  const button = event.target.closest?.('.sidebar-delete, .danger-icon-button, .class-card-delete, .lesson-card-delete')
  if (button && button === bypassButton) { bypassButton = null; return }
  if (button) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    openMenu(button)
    return
  }
  if (activeMenu) closeMenu()
}, true)

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && activeMenu) closeMenu()
})
window.addEventListener('resize', closeMenu)
window.addEventListener('scroll', closeMenu, true)
