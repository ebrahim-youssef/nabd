import { landingCopy } from '@nabd/shared'

export function LandingPage() {
  return (
    <main>
      <h1>{landingCopy.appName}</h1>
      <p>{landingCopy.tagline}</p>
      <p>{landingCopy.description}</p>
      <ul>
        {landingCopy.valueProps.map((valueProp) => (
          <li key={valueProp}>{valueProp}</li>
        ))}
      </ul>
    </main>
  )
}
