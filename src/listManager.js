import { Settings } from "./settings.js";

export default class ListManager{
    
    Twitch = {
        Auth: null,
        APIBase: 'https://api.twitch.tv/helix',
        Header: {
            'Content-Type': 'application/json',
            'Client-ID': 'at7fvpj8ydz12n5xwv8wf98urit01s',
            Authorization: null,
        }
    };

    Config = null;
    Users = null;
    ChannelUser = null;
    LiveTimer = null;
    
    constructor(auth)
    {
        this.Twitch.Auth = auth;
        this.Twitch.Header.Authorization = `Extension ${auth.helixToken}`;
    }

    start()
    {
        this.fetchConfig().then((config) => {  
            this.Config = config;
            this.fetchTwitchUsers(config).then((users) => {  
                this.Users = users;
                this.ChannelUser = Object.values(users).find(user => user.TwitchProfile.id == this.Twitch.Auth.channelId);

                this.setUI(config, this.ChannelUser);
                this.buildMemberList(users);
                this.startLiveCheck();
            });
        });
    }

    fetchConfig() {
        let config = `${Settings.RootURL}/${Settings.ConfigFile}`;
        return fetch(config).then(res => res.json());
    }

    fetchTwitchUsers(config){
        let users = Object.fromEntries(config.Users.filter(u => u.Info.Twitch)
                                                      .map(u => [u.Info.Twitch, u]));

        let params = Object.keys(users)
                           .map(key => `login=${key}`)
                           .join('&');

        return fetch(`${this.Twitch.APIBase}/users?${params}`, {headers:this.Twitch.Header})
                .then(response => response.json())
                .then(json => {
                    json.data.forEach((data) => {
                        users[data.login].Links.Twitch = `https://www.twitch.tv/${data.login}`;
                        users[data.login].TwitchProfile = data;
                        users[data.login].TwitchStream = null;
                    });
                    return users;
                });
    }

    fetchTwitchStreamData(users){
        let params = Object.keys(users).map(key => `user_login=${key}`).join('&');
        return fetch(`${this.Twitch.APIBase}/streams?${params}`, {headers:this.Twitch.Header})
                .then(response => response.json())
    }

    setUI(config, channelUser){
        document.getElementById("BannerDiscord").href = config.Discord;
        if(channelUser?.UI){
            let uiPath = `${Settings.RootURL}/${Settings.UIPath}`; 
            if(channelUser.UI.CSS){
                let cssUrl = `${uiPath}/${channelUser.UI.CSS}`;
                let link = document.createElement("link");
                link.rel = "stylesheet";
                link.href = cssUrl;
                document.head.append(link);
            }

            if(channelUser.UI.BannerBackground){
                let bannerURL = `${uiPath}/${channelUser.UI.BannerBackground}`;
                document.getElementById("Banner").style.backgroundImage = `url('${bannerURL}')`;
            }
        }

        window.Twitch.ext.actions.onFollow((didFollow,channelName)=> {
            this.onFollow(didFollow,channelName);
        });
    }

    buildMemberList(users){
        const template = document.getElementById("template").children[0];
        const teamList = document.getElementById("TeamList");
        teamList.textContent = '';

        Object.values(users).forEach(user => {
            user.ListElement = this.createMemberItem(template.cloneNode(true),user);
            teamList.appendChild(user.ListElement);
        });
    }

    createMemberItem(templateEl, user){
        templateEl.querySelector(".MemberName").textContent = user.Info.Name;
        templateEl.querySelector(".TwitchImageLink").href = user.Links.Twitch;
        templateEl.querySelector(".StreamerImage").src = user.TwitchProfile.profile_image_url;

        for (const [linkType, url] of Object.entries(user.Links)) {
            let link = templateEl.querySelector(`.${linkType}Link`);
            if(url)
                link.href = url;
            else
                link.style.display = 'none';
        };

        let twitchFollow = templateEl.querySelector(".TwitchFollow");
        twitchFollow.querySelector('input[type=checkbox]').id = `${user.TwitchProfile.login}TwitchFollow`;
        twitchFollow.querySelector('input[type=checkbox]').value = user.TwitchProfile.login;

        twitchFollow.querySelector('label').htmlFor = `${user.TwitchProfile.login}TwitchFollow`;

        templateEl.querySelector(".TwitchFollow").onclick = (e)=>{
            e.preventDefault();
            e.stopPropagation();
            this.followChannelClick(user.TwitchProfile.login);
        };
        
        return templateEl;
    }

    startLiveCheck(){
        this.liveCheck();
        this.LiveTimer = setInterval(()=>{this.liveCheck()}, Settings.LiveCheckInterval * 1000);
    }

    liveCheck(){
        this.fetchTwitchStreamData(this.Users).then((TwitchData) =>{
            Object.values(this.Users).forEach(user => {
                user.TwitchStream = TwitchData.data.find(stream => stream.user_login == user.TwitchProfile.login)
            });

            this.getListOrder(this.Users).forEach((userName,index) => {
                let user = this.Users[userName];
                if(user && user.ListElement){
                    user.ListElement.style.order = index;
                    user.ListElement.querySelector('.StreamerLive').style.display = (user.TwitchStream ? 'flex' : 'none');
                }
            });

        });
    }

    getListOrder(users)
    {
        let live = [];
        let nonLive = [];
        Object.values(users).forEach(user => {
            (user.TwitchStream ? live : nonLive)
                .push(user.TwitchProfile.login);
        });
        return live.sort().concat(nonLive.sort());
    }

    followChannelClick(channelId)
    {
        window.Twitch.ext.actions.followChannel(channelId);
    }

    onFollow(didFollow, channelName)
    {        
        if(didFollow)
        {
            let user = this.Users[channelName];
            if(user){
                user.ListElement.querySelector('.twitchFollow input[type="checkbox"]').checked = true;
            }
        }
    }
}
