import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errorMessage } from "@/lib/api";
import type { Role, Team } from "../../shared/types";

export function LoginCard({
  role,
  title,
  description,
  teams,
}: {
  role: Role;
  title: string;
  description: string;
  /** When given, the visitor signs in as one of these teams with that team's password. */
  teams?: Team[];
}) {
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [teamId, setTeamId] = useState("");
  const login = useMutation({
    mutationFn: () =>
      api("/api/login", { method: "POST", body: { role, password, teamId: teams ? Number(teamId) : undefined } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              login.mutate();
            }}
          >
            {teams &&
              (teams.length === 0 ? (
                <p className="text-sm text-muted-foreground">The organizers have not created teams yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="team">Team</Label>
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger id="team" className="w-full">
                      <SelectValue placeholder="Select your team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={String(team.id)}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">{teams ? "Team password" : "Password"}</Label>
              <Input
                id="password"
                type="password"
                autoFocus={!teams}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {login.isError && <p className="text-sm text-destructive">{errorMessage(login.error)}</p>}
            <Button type="submit" disabled={login.isPending || password === "" || (teams !== undefined && teamId === "")}>
              Enter
            </Button>
            <Link to="/privacy" className="text-center text-xs text-muted-foreground underline-offset-4 hover:underline">
              Privacy policy
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
