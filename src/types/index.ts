export interface Submitter {
  id: number
  username: string
  avatar: string | null
  name?: string | null
}

export interface Contributor {
  id: number
  username: string
  avatar: string | null
  type: 'comment' | 'vote'
}
