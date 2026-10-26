import { render } from 'preact'
import { registerSW } from 'virtual:pwa-register'
import { App } from './app'
import { requestPersistence } from './db'
import './styles.css'

registerSW({ immediate: true })
requestPersistence()

render(<App />, document.getElementById('app')!)
