import { createClient } from '~/lib/supabase/server'
import { Button } from '~/components/ui/button'
import {
  CardTitle,
} from '~/components/ui/card'
import {
  Field,
  FieldControl,
  FieldLabel,
} from "~/components/ui/field"
import { type ActionFunctionArgs, type LoaderFunctionArgs, Link, redirect, useFetcher } from 'react-router'
import { Fieldset } from '~/components/ui/fieldset'
import GoogleLogo from '~/components/logos/google'

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { supabase } = createClient(request)

  const { data, error } = await supabase.auth.getUser()
  if (!error && data?.user) {
    return redirect('/')
  }

  return null
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { supabase, headers } = createClient(request)
  const formData = await request.formData()

  const isOAuth = formData.get('oauth') === 'google'

  if (isOAuth) {
    const origin = new URL(request.url).origin

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/oauth?next=/`,
      },
    })

    if (data.url) {
      return redirect(data.url, { headers })
    }

    if (error) {
      return {
        error: error instanceof Error ? error.message : 'An error occurred',
      }
    }
  } else {  
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return {
        error: error instanceof Error ? error.message : 'An error occurred',
      }
    }

    return redirect('/', { headers })
  }
}

export default function Login() {
  const fetcher = useFetcher<typeof action>()

  const error = fetcher.data?.error
  const loading = fetcher.state === 'submitting'

  return (
    <div className="flex flex-col min-h-svh w-full items-center justify-center max-w-xs mx-auto">
      <Fieldset>
        <CardTitle className="text-2xl">Welcome!</CardTitle>

        <div className="flex flex-col gap-6">
          <fetcher.Form method="post">
            <input type="hidden" name="oauth" value="google" />
            <Button type="submit" variant="outline" className="w-full" disabled={loading}>
              <GoogleLogo />
              {loading ? 'Logging in...' : 'Continue with Google'}
            </Button>
          </fetcher.Form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <fetcher.Form method="post">
            <div className="flex flex-col gap-6">
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldControl
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <div className="flex items-center justify-between w-full">
                  <FieldLabel>Password</FieldLabel>
                </div>
                <FieldControl id="password" type="password" name="password" required />
              </Field>
              {error && <p className="text-sm text-destructive-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </div>
            <div className="mt-4 text-left text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/sign-up" className="underline underline-offset-4 text-blue-400 hover:text-blue-500">
                Sign up
              </Link>
            </div>
          </fetcher.Form>
        </div>
      </Fieldset>
    </div>
  )
}